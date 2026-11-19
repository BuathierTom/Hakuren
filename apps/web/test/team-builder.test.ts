import assert from 'node:assert/strict';
import test from 'node:test';
import {
  baseStats,
  changeFormation,
  emptyTeam,
  movePlayer,
  putPlayer,
  teamCounts,
  teamPower,
  teamReducer,
  type TeamPlayer,
  type Team,
  type TeamRarity,
} from '../src/features/team-builder/lib/team.ts';
import {
  decodeTeam,
  readDraft,
  readTeams,
  saveTeam,
  writeDraft,
} from '../src/features/team-builder/lib/storage.ts';
import { pitchLayout, pitchCardWidth } from '../src/features/team-builder/lib/pitch-layout.ts';
import type { Formation } from '../../../shared/formations.js';
function player(id: number, role = 'Player'): TeamPlayer {
  return {
    id,
    name: `Player ${id}`,
    portraitUrl: null,
    position: 'MF',
    element: 'wind',
    gender: 'male',
    playStyle: 'bond',
    role,
    rarities: ['common', 'rising', 'advanced', 'top', 'legendary', 'hero', 'basara'],
    profiles: [
      {
        rarity: 'common',
        level: 99,
        values: {
          power: 100,
          control: 120,
          technique: 140,
          pressure: 160,
          physical: 180,
          agility: 200,
          intelligence: 220,
        },
      },
      {
        rarity: 'hero',
        level: 99,
        values: {
          power: 110,
          control: 130,
          technique: 150,
          pressure: 170,
          physical: 190,
          agility: 210,
          intelligence: 230,
        },
      },
    ],
  };
}
const assignment = (id: number, rarity: TeamRarity = 'legendary') => ({
  player: player(id),
  rarity,
});
function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
  };
}
test('moving swaps both assignments without duplicating or losing their rarities', () => {
  let team = putPlayer(emptyTeam(), 'field-1', assignment(1, 'hero'));
  team = putPlayer(team, 'bench-1', assignment(2, 'basara'));
  const moved = movePlayer(team, 'field-1', 'bench-1');
  assert.equal(moved.slots['field-1']?.player.id, 2);
  assert.equal(moved.slots['field-1']?.rarity, 'basara');
  assert.equal(moved.slots['bench-1']?.rarity, 'hero');
  assert.equal(Object.keys(moved.slots).length, 2);
  assert.equal(team.slots['field-1']?.player.id, 1);
});
test('caps count the pitch only and reject an illegal swap atomically', () => {
  let team = putPlayer(emptyTeam(), 'field-1', assignment(1, 'basara'));
  team = putPlayer(team, 'bench-1', assignment(2, 'basara'));
  team = putPlayer(team, 'bench-2', assignment(3, 'basara'));
  team = putPlayer(team, 'field-2', assignment(4, 'hero'));
  team = putPlayer(team, 'field-3', assignment(5, 'hero'));
  team = putPlayer(team, 'bench-3', assignment(6, 'hero'));
  assert.deepEqual(teamCounts(team), { starters: 3, heroes: 2, basaras: 1 });
  assert.throws(() => movePlayer(team, 'bench-1', 'field-4'), /Un seul BASARA/);
  assert.throws(() => movePlayer(team, 'bench-3', 'field-4'), /Deux HERO/);
  assert.equal(team.slots['bench-1']?.player.id, 2);
  assert.equal(movePlayer(team, 'bench-1', 'field-1').slots['field-1']?.player.id, 2);
});
test('rarities must be available and one variant cannot occupy two slots', () => {
  const team = putPlayer(emptyTeam(), 'field-1', assignment(1));
  assert.throws(() => putPlayer(team, 'bench-1', assignment(1)), /déjà/);
  assert.throws(
    () =>
      putPlayer(team, 'field-2', {
        player: { ...player(2), rarities: ['common'] },
        rarity: 'hero',
      }),
    /indisponible/,
  );
});
test('coaches and managers use the corresponding game roles and cannot swap with a field player', () => {
  let team = putPlayer(emptyTeam(), 'coach', { player: player(1, 'Manager'), rarity: 'common' });
  team = putPlayer(team, 'manager-1', { player: player(2, 'Coordinator'), rarity: 'common' });
  team = putPlayer(team, 'field-1', assignment(3));
  assert.throws(() => movePlayer(team, 'field-1', 'coach'), /emplacements distincts/);
  assert.throws(() => putPlayer(team, 'manager-2', assignment(4)), /emplacement/);
  assert.equal(teamCounts(team).starters, 1);
});
test('rarity changes update base power and use actual HERO tables; missing BASARA data stays unknown', () => {
  assert.equal(baseStats(assignment(1))?.power, 140);
  assert.equal(baseStats(assignment(1, 'hero'))?.power, 110);
  assert.equal(baseStats(assignment(1, 'basara')), null);
  let team = putPlayer(emptyTeam(), 'field-1', assignment(1, 'common'));
  team = putPlayer(team, 'bench-1', assignment(2));
  assert.deepEqual(teamPower(team), {
    missing: 0,
    totals: {
      shootAT: 220,
      focusAT: 310,
      focusDF: 460,
      wallDF: 340,
      scrambleAT: 400,
      scrambleDF: 380,
      kp: 1660,
    },
  });
  assert.equal(teamPower(putPlayer(team, 'field-1', assignment(1, 'basara'))).missing, 1);
});
test('undo, redo and branching restore complete teams', () => {
  const initial = emptyTeam();
  let state = { past: [] as Team[], present: initial, future: [] as Team[] };
  state = teamReducer(state, {
    type: 'change',
    team: putPlayer(initial, 'field-1', assignment(1)),
  });
  state = teamReducer(state, { type: 'undo' });
  assert.deepEqual(state.present, initial);
  state = teamReducer(state, { type: 'redo' });
  assert.equal(state.present.slots['field-1']?.player.id, 1);
  state = teamReducer(state, { type: 'undo' });
  state = teamReducer(state, { type: 'change', team: { ...state.present, name: 'New name' } });
  assert.equal(state.future.length, 0);
});
test('formation changes preserve all players, special limits and bench assignments', () => {
  const positions: Formation['positions'] = Array.from({ length: 11 }, (_, i) => ({
    slot: i + 1,
    position: i === 0 ? 'GK' : i < 5 ? 'DF' : i < 8 ? 'MF' : 'FW',
    x: 50,
    y: i * 10,
  }));
  const old: Formation = { id: 1, code: 'old', name: 'Old', positions };
  const next: Formation = {
    id: 2,
    code: 'new',
    name: 'New',
    positions: positions.map((p) => ({ ...p, position: p.slot === 5 ? 'MF' : p.position })),
  };
  let team = { ...emptyTeam(), formation: 'old' };
  for (let i = 1; i <= 11; i++) team = putPlayer(team, `field-${i}`, assignment(i));
  team = putPlayer(team, 'bench-1', assignment(12, 'basara'));
  const changed = changeFormation(team, next, old);
  assert.equal(changed.formation, 'new');
  assert.deepEqual(
    Object.values(changed.slots)
      .map((a) => a.player.id)
      .sort((a, b) => a - b),
    Array.from({ length: 12 }, (_, i) => i + 1),
  );
  assert.equal(changed.slots['bench-1']?.rarity, 'basara');
});
test('saved teams update by identity, keep independent snapshots and restore draft after reload', () => {
  const storage = memoryStorage();
  const team = putPlayer(emptyTeam(), 'field-1', assignment(1));
  writeDraft(storage, team);
  assert.deepEqual(readDraft(storage).team, team);
  saveTeam(storage, team);
  saveTeam(storage, { ...team, name: 'Renamed' });
  const saved = readTeams(storage);
  assert.equal(saved.length, 1);
  assert.equal(saved[0]?.team.name, 'Renamed');
  assert.equal(readDraft(storage).team?.name, 'Mon équipe');
});
test('corrupt or incompatible saved data is rejected without overwriting the library', () => {
  const storage = memoryStorage();
  storage.setItem('hakuren.teams.v1', '{"version":2,"teams":[]}');
  assert.throws(() => saveTeam(storage, emptyTeam()), /illisibles/);
  assert.equal(storage.getItem('hakuren.teams.v1'), '{"version":2,"teams":[]}');
  assert.equal(
    decodeTeam({
      ...emptyTeam(),
      slots: {
        'field-1': {
          ...assignment(1),
          player: { ...player(1), portraitUrl: 'javascript:alert(1)' },
        },
      },
    }),
    null,
  );
  assert.equal(
    decodeTeam({ ...emptyTeam(), slots: { 'field-1': assignment(1), 'bench-1': assignment(1) } }),
    null,
  );
  assert.equal(
    decodeTeam({ ...emptyTeam(), slots: { 'field-1': { ...assignment(1), rarity: 'invalid' } } }),
    null,
  );
});
test('all cards stay inside the pitch and clear their neighbours at narrow widths', () => {
  const positions: Formation['positions'] = [
    { slot: 1, position: 'GK', x: 50, y: 0 },
    ...[12.5, 37.5, 62.5, 87.5].map((x, i) => ({ slot: i + 2, position: 'MF' as const, x, y: 47 })),
    { slot: 6, position: 'FW', x: 50, y: 100 },
  ];
  for (const width of [271, 286, 340, 620, 850]) {
    const layout = pitchLayout(positions, width);
    assert(layout.every((p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100));
    const row = layout.filter((p) => p.position === 'MF').sort((a, b) => a.x - b.x);
    const cardWidth = pitchCardWidth(width);
    for (let i = 1; i < row.length; i++)
      assert(((row[i]!.x - row[i - 1]!.x) / 100) * (width - cardWidth - 28) >= cardWidth + 9.99);
  }
});
