import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import { hash, token } from '../src/auth/security.js';
import { authConfig, discordUser, memoryAuth } from './helpers/auth.js';

async function setup() {
  const memory = memoryAuth();
  const raw = token();
  const second = token();
  const other = token();
  const user = await memory.repository.signIn(discordUser, hash(raw));
  await memory.repository.signIn(discordUser, hash(second));
  await memory.repository.signIn({ ...discordUser, discordId: '999999999999999999' }, hash(other));
  const app = buildApp({ auth: { config: authConfig, repository: memory.repository } });
  return {
    app,
    memory,
    raw,
    second,
    other,
    user,
    headers: {
      origin: authConfig.appUrl,
      cookie: `hakuren_session=${raw}`,
      'x-hakuren-account': String(user.id),
    },
  };
}
test('account deletion requires a current session, matching account, same origin and explicit confirmation', async (t) => {
  const { app, headers, memory } = await setup();
  t.after(() => app.close());
  for (const [changes, payload, expected] of [
    [{ cookie: '' }, { confirm: true }, 401],
    [{ origin: 'https://attacker.example' }, { confirm: true }, 403],
    [{ origin: '' }, { confirm: true }, 403],
    [{ 'x-hakuren-account': '2' }, { confirm: true }, 409],
    [{ 'x-hakuren-account': '' }, { confirm: true }, 409],
    [{}, { confirm: false }, 400],
    [{}, {}, 400],
    [{}, { confirm: true, userId: 2 }, 400],
  ] as const) {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/me/account',
      headers: { ...headers, ...changes },
      payload,
    });
    assert.equal(response.statusCode, expected, response.body);
    assert.equal(memory.users.size, 2);
    assert.equal(memory.sessions.size, 3);
  }
});
test('deleting an account revokes all its sessions, clears cookies and preserves other users', async (t) => {
  const { app, memory, headers, raw, second, other } = await setup();
  t.after(() => app.close());
  const response = await app.inject({
    method: 'DELETE',
    url: '/api/me/account',
    headers,
    payload: { confirm: true },
  });
  assert.equal(response.statusCode, 204, response.body);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.match(String(response.headers['set-cookie']), /hakuren_session=;/);
  assert.equal(await memory.repository.session(hash(raw)), null);
  assert.equal(await memory.repository.session(hash(second)), null);
  assert(await memory.repository.session(hash(other)));
  assert.equal(memory.users.size, 1);
  const repeated = await app.inject({
    method: 'DELETE',
    url: '/api/me/account',
    headers,
    payload: { confirm: true },
  });
  assert.equal(repeated.statusCode, 401);
});
test('a failed account deletion keeps the session and does not expose database errors', async (t) => {
  const { app, memory, headers, raw } = await setup();
  t.after(() => app.close());
  memory.repository.deleteAccount = async () => {
    throw new Error('private database details');
  };
  const response = await app.inject({
    method: 'DELETE',
    url: '/api/me/account',
    headers,
    payload: { confirm: true },
  });
  assert.equal(response.statusCode, 503);
  assert.doesNotMatch(response.body, /private database/);
  assert(!response.headers['set-cookie']);
  assert(await memory.repository.session(hash(raw)));
});
