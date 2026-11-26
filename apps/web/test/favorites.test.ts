import assert from 'node:assert/strict';
import test from 'node:test';
import { createFavoritesApi } from '../src/features/favorites/lib/api.js';
import { clearDeletedAccount } from '../src/features/auth/lib/deleted-account.js';

test('favorites requests identify the active account, bypass shared caches and preserve server errors', async () => {
  const calls: { url: string; options?: RequestInit }[] = [];
  const request: typeof fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith('/bad'))
      return new Response(JSON.stringify({ message: 'Cette playlist est introuvable.' }), {
        status: 404,
      });
    return new Response(JSON.stringify({ playlists: [], entries: [] }));
  };
  const api = createFavoritesApi(42, request);
  const signal = new AbortController().signal;
  await api.state(signal);
  await api.create('Équipe A', signal);
  await api.set('id', 'players', 7, true, signal);
  await api.set('id', 'teams', 7, false, signal);
  assert(
    calls.every(
      ({ options }) =>
        new Headers(options?.headers).get('X-Hakuren-Account') === '42' &&
        options?.cache === 'no-store' &&
        options?.credentials === 'same-origin' &&
        options.signal === signal,
    ),
  );
  assert.deepEqual(
    calls.map((c) => c.options?.method),
    ['GET', 'POST', 'PUT', 'DELETE'],
  );
  assert.deepEqual(JSON.parse(String(calls[1]!.options?.body)), { name: 'Équipe A' });
  assert.equal(calls[2]!.url, '/api/me/favorite-playlists/id/entries/players/7');
  await assert.rejects(api.remove('bad', signal), /Cette playlist est introuvable/);
});
test('account deletion clears only the deleted account backups and keeps guest and other account data', () => {
  const data = new Map([
    ['hakuren.account.42.draft.v1', 'draft'],
    ['hakuren.account.42.recovery.v1', 'recovery'],
    ['hakuren.account.42.local-import.v1', 'receipt'],
    ['hakuren.account.420.draft.v1', 'other'],
    ['hakuren.team-draft.v1', 'guest'],
    ['hakuren.teams.v1', 'teams'],
    ['unrelated', 'value'],
  ]);
  const storage = {
    get length() {
      return data.size;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
  } as Storage;
  clearDeletedAccount(storage, 42);
  assert.deepEqual(
    [...data.keys()],
    ['hakuren.account.420.draft.v1', 'hakuren.team-draft.v1', 'hakuren.teams.v1', 'unrelated'],
  );
  clearDeletedAccount(storage, 42);
  assert.equal(data.size, 4);
});
