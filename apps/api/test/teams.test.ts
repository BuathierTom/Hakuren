import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import { TeamError } from '../src/teams/errors.js';
import type { TeamRepository } from '../src/teams/repository.js';
import type { AccountTeam } from '../../../shared/teams.js';
import { hash, token } from '../src/auth/security.js';
import { memoryAuth, authConfig, discordUser } from './helpers/auth.js';
import { exampleTeam } from './helpers/teams.js';
function memoryTeams() {
  const items = new Map<string, AccountTeam>();
  const drafts = new Map<number, AccountTeam>();
  const repository: TeamRepository = {
    async list(owner) {
      return [...items.entries()]
        .filter(([key]) => key.startsWith(owner + ':'))
        .map(([, value]) => structuredClone(value));
    },
    async draft(owner) {
      return structuredClone(drafts.get(owner) ?? null);
    },
    async save(owner, team, revision, draft = false) {
      const key = `${owner}:${team.id}`;
      const current = draft ? drafts.get(owner) : items.get(key);
      if ((current?.revision ?? null) !== revision)
        throw new TeamError(409, 'TEAM_CONFLICT', 'Cette composition a été modifiée ailleurs.');
      const saved = {
        team: structuredClone(team),
        revision: (current?.revision ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      if (draft) drafts.set(owner, saved);
      else items.set(key, saved);
      return saved;
    },
    async remove(owner, id, revision) {
      const key = `${owner}:${id}`;
      const current = items.get(key);
      if (!current) throw new TeamError(404, 'TEAM_NOT_FOUND', 'Cette équipe est introuvable.');
      if (current.revision !== revision)
        throw new TeamError(409, 'TEAM_CONFLICT', 'Cette équipe a changé.');
      items.delete(key);
    },
  };
  return { repository, items, drafts };
}
async function setup() {
  const auth = memoryAuth();
  const teams = memoryTeams();
  const raw = token();
  const user = await auth.repository.signIn(discordUser, hash(raw));
  const app = buildApp({
    auth: { config: authConfig, repository: auth.repository },
    teams: teams.repository,
  });
  const headers = {
    cookie: `hakuren_session=${raw}`,
    origin: authConfig.appUrl,
    'x-hakuren-account': String(user.id),
  };
  return { app, auth, teams, headers, user };
}
test('account teams require a valid session, the expected account and the application origin', async (t) => {
  const { app, headers, auth } = await setup();
  t.after(() => app.close());
  assert.equal((await app.inject('/api/me/teams')).statusCode, 401);
  assert.equal(
    (await app.inject({ url: '/api/me/teams', headers: { cookie: headers.cookie } })).statusCode,
    409,
  );
  for (const origin of [undefined, 'https://evil.test', 'null']) {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/me/teams/hakuren-team',
      headers: { cookie: headers.cookie, 'x-hakuren-account': '1', ...(origin ? { origin } : {}) },
      payload: { team: exampleTeam(), revision: null },
    });
    assert.equal(response.statusCode, 403);
  }
  assert.equal(
    (
      await app.inject({ url: '/api/me/teams', headers: { ...headers, 'x-hakuren-account': '2' } })
    ).json().error,
    'ACCOUNT_CHANGED',
  );
  auth.sessions.clear();
  assert.equal((await app.inject({ url: '/api/me/teams', headers })).statusCode, 401);
});
test('a complete composition and its independent draft round-trip through private routes', async (t) => {
  const { app, headers } = await setup();
  t.after(() => app.close());
  const team = exampleTeam();
  const created = await app.inject({
    method: 'PUT',
    url: '/api/me/teams/' + team.id,
    headers,
    payload: { team, revision: null },
  });
  assert.equal(created.statusCode, 201, created.body);
  assert.deepEqual(created.json().team, team);
  assert.equal(created.json().revision, 1);
  assert.equal(created.headers['cache-control'], 'no-store');
  assert.deepEqual((await app.inject({ url: '/api/me/teams', headers })).json().items, [
    created.json(),
  ]);
  assert.equal((await app.inject({ url: '/api/me/team-draft', headers })).json().draft, null);
  const draft = { ...team, name: 'Unsaved draft', slots: {} };
  assert.equal(
    (
      await app.inject({
        method: 'PUT',
        url: '/api/me/team-draft',
        headers,
        payload: { team: draft, revision: null },
      })
    ).statusCode,
    200,
  );
  assert.deepEqual(
    (await app.inject({ url: '/api/me/team-draft', headers })).json().draft.team,
    draft,
  );
  assert.equal(
    (await app.inject({ url: '/api/me/teams', headers })).json().items[0].team.name,
    'Hakuren',
  );
  const edited = await app.inject({
    method: 'PUT',
    url: '/api/me/teams/' + team.id,
    headers,
    payload: { team: { ...team, name: 'Renamed' }, revision: 1 },
  });
  assert.equal(edited.json().revision, 2);
  assert.equal(
    (
      await app.inject({
        method: 'PUT',
        url: '/api/me/teams/' + team.id,
        headers,
        payload: { team, revision: 1 },
      })
    ).statusCode,
    409,
  );
  assert.equal(
    (
      await app.inject({
        method: 'DELETE',
        url: '/api/me/teams/' + team.id,
        headers,
        payload: { revision: 1 },
      })
    ).statusCode,
    409,
  );
  assert.equal(
    (
      await app.inject({
        method: 'DELETE',
        url: '/api/me/teams/' + team.id,
        headers,
        payload: { revision: 2 },
      })
    ).statusCode,
    204,
  );
  assert.equal((await app.inject({ url: '/api/me/teams', headers })).json().items.length, 0);
});
test('identical team identifiers on different accounts stay private for reads, edits and deletion', async (t) => {
  const { app, headers, auth } = await setup();
  t.after(() => app.close());
  const otherRaw = token();
  const other = await auth.repository.signIn(
    { ...discordUser, discordId: '345678901234567890' },
    hash(otherRaw),
  );
  const otherHeaders = {
    ...headers,
    cookie: `hakuren_session=${otherRaw}`,
    'x-hakuren-account': String(other.id),
  };
  const team = exampleTeam();
  await app.inject({
    method: 'PUT',
    url: '/api/me/teams/' + team.id,
    headers,
    payload: { team, revision: null },
  });
  assert.deepEqual(
    (await app.inject({ url: '/api/me/teams', headers: otherHeaders })).json().items,
    [],
  );
  assert.equal(
    (
      await app.inject({
        method: 'DELETE',
        url: '/api/me/teams/' + team.id,
        headers: otherHeaders,
        payload: { revision: 1 },
      })
    ).statusCode,
    404,
  );
  assert.equal(
    (
      await app.inject({
        method: 'PUT',
        url: '/api/me/teams/' + team.id,
        headers: otherHeaders,
        payload: { team: { ...team, name: 'Other account' }, revision: 1 },
      })
    ).statusCode,
    409,
  );
  assert.equal(
    (
      await app.inject({
        method: 'PUT',
        url: '/api/me/teams/' + team.id,
        headers: otherHeaders,
        payload: { team: { ...team, name: 'Other account' }, revision: null },
      })
    ).statusCode,
    201,
  );
  assert.equal(
    (await app.inject({ url: '/api/me/teams', headers })).json().items[0].team.name,
    'Hakuren',
  );
  assert.equal(
    (
      await app.inject({
        method: 'PUT',
        url: '/api/me/team-draft',
        headers,
        payload: { team, revision: null },
      })
    ).statusCode,
    200,
  );
  assert.equal(
    (await app.inject({ url: '/api/me/team-draft', headers: otherHeaders })).json().draft,
    null,
  );
});
test('server validation rejects malformed slots, impossible rarities, duplicates and excess field heroes', async (t) => {
  const { app, headers } = await setup();
  t.after(() => app.close());
  const original = exampleTeam();
  const player = original.slots['field-1']!;
  const invalid = [
    { ...original, id: 'mismatch' },
    { ...original, userId: 2 },
    { ...original, name: ' ' },
    { ...original, slots: { 'field-12': player } },
    { ...original, slots: { 'field-1': player, 'bench-1': player } },
    { ...original, slots: { 'manager-1': player } },
    { ...original, slots: { 'field-1': { ...player, rarity: 'rising' } } },
    {
      ...original,
      slots: {
        'field-1': { ...player, player: { ...player.player, portraitUrl: 'javascript:alert(1)' } },
      },
    },
    { ...original, slots: { 'field-1': { ...player, equipment: { unknown: 42 } } } },
    { ...original, slots: { 'field-1': { ...player, passives: Array(7).fill(null) } } },
    {
      ...original,
      slots: Object.fromEntries(
        [1, 2, 3].map((id) => [`field-${id}`, { ...player, player: { ...player.player, id } }]),
      ),
    },
    {
      ...original,
      slots: Object.fromEntries(
        [1, 2].map((id) => [
          `field-${id}`,
          { ...player, rarity: 'basara', player: { ...player.player, id } },
        ]),
      ),
    },
  ];
  for (const team of invalid) {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/me/teams/' + original.id,
      headers,
      payload: { team, revision: null },
    });
    assert.equal(response.statusCode, 400, response.body);
  }
  const bench = {
    ...original,
    slots: Object.fromEntries(
      [1, 2, 3].map((id) => [`bench-${id}`, { ...player, player: { ...player.player, id } }]),
    ),
  };
  assert.equal(
    (
      await app.inject({
        method: 'PUT',
        url: '/api/me/teams/' + bench.id,
        headers,
        payload: { team: bench, revision: null },
      })
    ).statusCode,
    201,
  );
  assert.equal(
    (
      await app.inject({
        method: 'PUT',
        url: '/api/me/team-draft',
        headers,
        payload: { team: { ...original, name: '' }, revision: null },
      })
    ).statusCode,
    200,
  );
});
test('unavailable team storage returns a recoverable error without database details', async (t) => {
  const { headers, auth, teams } = await setup();
  const app = buildApp({
    auth: { config: authConfig, repository: auth.repository },
    teams: {
      ...teams.repository,
      list: async () => {
        throw new Error('mysql://private-password@localhost');
      },
    },
  });
  t.after(() => app.close());
  const response = await app.inject({ url: '/api/me/teams', headers });
  assert.equal(response.statusCode, 503);
  assert(!response.body.includes('private-password'));
  const empty = buildApp();
  t.after(() => empty.close());
  assert.equal((await empty.inject('/api/me/teams')).statusCode, 503);
});
