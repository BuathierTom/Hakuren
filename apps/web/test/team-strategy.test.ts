import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyTeam, teamReducer } from '../src/features/team-builder/lib/team.ts';
import { setTeamTactic } from '../src/features/team-builder/lib/team-strategy.ts';
import { decodeTeam, writeDraft, readDraft } from '../src/features/team-builder/lib/storage.ts';
import { loadTactics } from '../src/features/catalogue/lib/tactics.ts';
import { teamImageModel } from '../src/features/team-builder/lib/team-image/model.ts';
import type { CatalogueItem } from '../../../shared/catalogue.js';

const tactic = (id: number): CatalogueItem => ({
  id,
  name: `Tactique ${id}`,
  section: 'tactics',
  gameId: String(id),
  stringId: `wht${id}`,
  slot: null,
  description: null,
  imageUrl: null,
  tension: 30,
  stats: {},
  sourceUrl: null,
});
test('old teams remain readable and strategy round-trips through the browser draft', () => {
  const legacy = emptyTeam();
  assert.deepEqual(decodeTeam(legacy), legacy);
  const team = setTeamTactic({ ...legacy, playStyle: 'rough_play' }, 2, 71);
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } as Storage;
  writeDraft(storage, team);
  assert.deepEqual(readDraft(storage).team, team);
  assert.deepEqual(team.tactics, [null, null, 71]);
  assert.equal(team.playStyle, 'rough_play');
  for (const extra of [
    { tactics: [1, 2, 3, 4] },
    { tactics: [1, null, 1] },
    { tactics: [0] },
    { tactics: [NaN] },
    { tactics: ['1'] },
    { playStyle: 'invalid' },
  ])
    assert.equal(decodeTeam({ ...legacy, ...extra }), null);
});
test('a tactic cannot be selected twice or added in a fourth slot and one undo restores the entire strategy', () => {
  const before = emptyTeam();
  const after = setTeamTactic({ ...before, playStyle: 'counter' }, 0, 5);
  assert.throws(() => setTeamTactic(after, 1, 5));
  assert.throws(() => setTeamTactic(after, 3, 6));
  assert.throws(() => setTeamTactic(after, 1, -1));
  assert.equal(setTeamTactic(after, 0, null).tactics?.[0], null);
  const history = teamReducer(
    { past: [], present: before, future: [] },
    { type: 'change', team: after },
  );
  assert.deepEqual(teamReducer(history, { type: 'undo' }).present, before);
  assert.deepEqual(before.tactics, undefined);
});
test('exports retain the manual build, tactic order and unknown selections without changing the team', () => {
  const team = { ...emptyTeam(), playStyle: 'bond' as const, tactics: [71, null, 999] };
  const model = teamImageModel(
    team,
    { id: 1, code: 'test', name: 'Test', positions: [] },
    undefined,
    [tactic(71)],
  );
  assert.equal(model.playStyle, 'bond');
  assert.equal(model.tactics[0]?.item?.name, 'Tactique 71');
  assert.equal(model.tactics[1]?.id, null);
  assert.equal(model.tactics[2]?.id, 999);
  assert.equal(model.tactics[2]?.item, null);
  assert.deepEqual(team.tactics, [71, null, 999]);
});
test('the builder fetches every tactic page, retries failures and reuses the public catalogue', async (t) => {
  const original = globalThis.fetch;
  let fail = true;
  const pages: number[] = [];
  globalThis.fetch = (async (input) => {
    if (fail) return new Response('{}', { status: 503 });
    const page = Number(new URL(String(input), 'http://localhost').searchParams.get('page'));
    pages.push(page);
    return new Response(
      JSON.stringify({
        items: Array.from({ length: page === 1 ? 48 : 23 }, (_, index) =>
          tactic((page - 1) * 48 + index + 1),
        ),
        page,
        pages: 2,
        total: 71,
        limit: 48,
      }),
    );
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  await assert.rejects(loadTactics());
  fail = false;
  const items = await loadTactics();
  assert.equal(items.length, 71);
  assert.equal(items[70]?.id, 71);
  assert.deepEqual(pages, [1, 2]);
  assert.equal(await loadTactics(), items);
  assert.deepEqual(pages, [1, 2]);
});
