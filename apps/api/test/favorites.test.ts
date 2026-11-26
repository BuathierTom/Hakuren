import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import { hash, token } from '../src/auth/security.js';
import { FavoriteError } from '../src/favorites/errors.js';
import type { FavoriteRepository } from '../src/favorites/repository.js';
import { authConfig, discordUser, memoryAuth } from './helpers/auth.js';

async function setup() {
  const memory = memoryAuth();
  const raw = token();
  const user = await memory.repository.signIn(discordUser, hash(raw));
  const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const state = { playlists: [{ id, name: 'Like', isDefault: true }], entries: [] };
  const calls: unknown[][] = [];
  const favorites: FavoriteRepository = {
    async state(...args) {
      calls.push(['state', ...args]);
      return state;
    },
    async create(...args) {
      calls.push(['create', ...args]);
      return state;
    },
    async remove(...args) {
      calls.push(['remove', ...args]);
      return state;
    },
    async set(...args) {
      calls.push(['set', ...args]);
      return state;
    },
    async entries(...args) {
      calls.push(['entries', ...args]);
      return { items: [], total: 0, page: args[3], limit: 24, pages: 0 };
    },
  };
  const app = buildApp({ favorites, auth: { config: authConfig, repository: memory.repository } });
  return {
    app,
    calls,
    favorites,
    user,
    id,
    headers: {
      cookie: `hakuren_session=${raw}`,
      origin: authConfig.appUrl,
      'x-hakuren-account': String(user.id),
    },
  };
}
test('favorites routes bind reads and mutations to the signed-in account and reject cross-origin writes', async (t) => {
  const { app, id, headers, calls } = await setup();
  t.after(() => app.close());
  for (const [method, url, changes, expected] of [
    ['GET', '/api/me/favorites', { cookie: '' }, 401],
    ['GET', '/api/me/favorites', { 'x-hakuren-account': '2' }, 409],
    [
      'PUT',
      `/api/me/favorite-playlists/${id}/entries/players/1`,
      { origin: 'https://attacker.example' },
      403,
    ],
    ['DELETE', `/api/me/favorite-playlists/${id}`, { origin: '' }, 403],
  ] as const) {
    const response = await app.inject({ method, url, headers: { ...headers, ...changes } });
    assert.equal(response.statusCode, expected, response.body);
  }
  assert.equal(calls.length, 0);
});
test('favorites routes support all five categories and idempotent playlist membership operations', async (t) => {
  const { app, headers, calls, id, user } = await setup();
  t.after(() => app.close());
  const get = await app.inject({ url: '/api/me/favorites', headers });
  assert.equal(get.statusCode, 200);
  assert.equal(get.headers['cache-control'], 'no-store');
  const create = await app.inject({
    method: 'POST',
    url: '/api/me/favorite-playlists',
    headers,
    payload: { name: 'Mon équipe' },
  });
  assert.equal(create.statusCode, 201);
  for (const kind of ['players', 'techniques', 'equipment', 'tactics', 'teams']) {
    const url = `/api/me/favorite-playlists/${id}/entries/${kind}/42`;
    for (const method of ['PUT', 'DELETE'] as const) {
      const response = await app.inject({ method, url, headers });
      assert.equal(response.statusCode, 200, response.body);
      assert.deepEqual(calls.at(-1), ['set', user.id, id, kind, 42, method === 'PUT']);
    }
  }
  const page = await app.inject({
    url: `/api/me/favorite-playlists/${id}/entries?kind=players&page=2`,
    headers,
  });
  assert.equal(page.statusCode, 200);
  assert.deepEqual(calls.at(-1), ['entries', user.id, id, 'players', 2]);
  const remove = await app.inject({
    method: 'DELETE',
    url: `/api/me/favorite-playlists/${id}`,
    headers,
  });
  assert.equal(remove.statusCode, 200);
});
test('favorites reject malformed IDs, categories, page numbers and playlist names before touching storage', async (t) => {
  const { app, headers, calls, id } = await setup();
  t.after(() => app.close());
  for (const url of [
    `/api/me/favorite-playlists/${id}/entries/passives/1`,
    `/api/me/favorite-playlists/${id}/entries/players/0`,
    `/api/me/favorite-playlists/${id}/entries/players/4294967296`,
    '/api/me/favorite-playlists/bad/entries/players/1',
  ])
    assert.equal((await app.inject({ method: 'PUT', url, headers })).statusCode, 400);
  for (const query of ['kind=players&page=0', 'kind=unknown', 'kind=teams&userId=2'])
    assert.equal(
      (await app.inject({ url: `/api/me/favorite-playlists/${id}/entries?${query}`, headers }))
        .statusCode,
      400,
    );
  for (const payload of [{ name: '' }, { name: 'a'.repeat(81) }, { name: 'One', userId: 2 }])
    assert.equal(
      (await app.inject({ method: 'POST', url: '/api/me/favorite-playlists', headers, payload }))
        .statusCode,
      400,
    );
  assert.equal(calls.length, 0);
});
test('favorites expose expected ownership errors and hide unexpected storage failures', async (t) => {
  const { app, favorites, headers, id } = await setup();
  t.after(() => app.close());
  favorites.remove = async () => {
    throw new FavoriteError(404, 'PLAYLIST_NOT_FOUND', 'Cette playlist est introuvable.');
  };
  assert.equal(
    (await app.inject({ method: 'DELETE', url: `/api/me/favorite-playlists/${id}`, headers }))
      .statusCode,
    404,
  );
  favorites.state = async () => {
    throw new Error('private database credentials');
  };
  const response = await app.inject({ url: '/api/me/favorites', headers });
  assert.equal(response.statusCode, 503);
  assert.doesNotMatch(response.body, /private database/);
});
