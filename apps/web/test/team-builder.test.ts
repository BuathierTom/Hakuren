import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  baseStats,
  clearTeam,
  assignmentStats,
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
import { pitchGeometry } from '../src/features/team-builder/lib/pitch-layout.ts';
import {
  assignmentAppearance,
  rarityAppearance,
} from '../src/features/team-builder/lib/rarity-appearance.ts';
import { teamAlerts, playerWarning } from '../src/features/team-builder/lib/team-alerts.ts';
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
  assert.throws(() => movePlayer(team, 'bench-1', 'field-4'), /Un seul Basara/);
  assert.throws(() => movePlayer(team, 'bench-3', 'field-4'), /Deux joueurs Héro/);
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
test('all eight formations keep larger mobile cards inside the pitch without collisions', () => {
  const sql = readFileSync(
    new URL('../../api/database/changes/005-formations.sql', import.meta.url),
    'utf8',
  );
  const formations = new Map<string, Formation['positions']>();
  for (const match of sql.matchAll(
    /SELECT id, (\d+), '(GK|DF|MF|FW)', ([\d.]+), ([\d.]+) FROM formations WHERE code = '([^']+)'/g,
  )) {
    const code = match[5]!;
    if (!formations.has(code)) formations.set(code, []);
    const members = formations.get(code)!;
    members.push({
      slot: Number(match[1]),
      position: match[2] as 'GK' | 'DF' | 'MF' | 'FW',
      x: Number(match[3]),
      y: Number(match[4]),
    });
  }
  assert.equal(formations.size, 8);
  for (const [code, positions] of formations)
    for (const width of [271, 286, 311, 343, 390, 480, 620, 850, 1024]) {
      const geometry = pitchGeometry(positions, width);
      const { cardWidth, cardHeight, boardHeight } = geometry;
      const playableWidth = width - cardWidth - 28;
      const playableHeight = boardHeight - cardHeight - 30;
      assert.equal(geometry.positions.length, 11);
      assert.equal(new Set(geometry.positions.map((p) => p.slot)).size, 11);
      assert(geometry.positions.every((p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100));
      if (width < 500) {
        assert(cardWidth >= 64);
        assert.equal(cardHeight, 52);
      }
      if (width < 500 && code === '4-3-3-triangle') {
        const centerX = (slot: number) =>
          cardWidth / 2 +
          14 +
          (geometry.positions.find((position) => position.slot === slot)!.x / 100) * playableWidth;
        assert(centerX(10) - centerX(9) >= width * 0.55, 'The wingers must stay wide on mobile.');
        assert(
          centerX(5) - centerX(4) >= width * 0.6,
          'The full-backs must stay wider than the centre-backs.',
        );
        assert(centerX(9) < centerX(6) && centerX(10) > centerX(7));
      }
      for (let i = 0; i < geometry.positions.length; i++)
        for (let j = i + 1; j < geometry.positions.length; j++) {
          const a = geometry.positions[i]!,
            b = geometry.positions[j]!;
          const dx = (Math.abs(a.x - b.x) / 100) * playableWidth;
          const dy = (Math.abs(a.y - b.y) / 100) * playableHeight;
          const shearedWidth = cardWidth + cardHeight * Math.tan(Math.PI / 20);
          assert(
            dx >= shearedWidth - 0.01 || dy >= cardHeight + 5.99,
            `${code} at ${width}px: slots ${a.slot} and ${b.slot} overlap`,
          );
        }
    }
});

test('off-position alerts share French labels with the card and disappear after correcting the position', () => {
  const formation: Formation = {
    id: 1,
    code: 'test',
    name: 'Test',
    positions: Array.from({ length: 11 }, (_, i) => ({
      slot: i + 1,
      position: i === 0 ? 'GK' : i < 5 ? 'DF' : 'MF',
      x: 50,
      y: i * 10,
    })),
  };
  const team = putPlayer(emptyTeam(), 'field-2', {
    ...assignment(1),
    player: { ...player(1), name: 'Byron Love' },
  });
  const alerts = teamAlerts(team, formation);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0]?.message, '1 joueur hors poste : Byron Love (MIL → DÉF)');
  assert.equal(playerWarning(alerts, 'field-2'), 'Hors poste : Byron Love (MIL → DÉF)');
  assert.equal(playerWarning(alerts, 'field-3'), null);
  assert.deepEqual(teamAlerts(movePlayer(team, 'field-2', 'field-6'), formation), []);
  assert.deepEqual(teamAlerts(movePlayer(team, 'field-2', 'bench-1'), formation), []);
});
test('card alerts combine missing data and role warnings while special rarity limits ignore the bench', () => {
  const formation: Formation = {
    id: 1,
    code: 'test',
    name: 'Test',
    positions: Array.from({ length: 11 }, (_, i) => ({
      slot: i + 1,
      position: i === 0 ? 'GK' : 'MF',
      x: 50,
      y: i * 10,
    })),
  };
  let team = putPlayer(emptyTeam(), 'field-1', {
    ...assignment(1),
    player: { ...player(1), profiles: [] },
  });
  let alerts = teamAlerts(team, formation);
  assert.equal(alerts.length, 2);
  assert.match(playerWarning(alerts, 'field-1')!, /MIL → GAR/);
  assert.match(playerWarning(alerts, 'field-1')!, /Statistiques de base incomplètes/);
  team = {
    ...team,
    slots: {
      'field-2': assignment(2, 'hero'),
      'field-3': assignment(3, 'hero'),
      'field-4': assignment(4, 'hero'),
      'field-5': assignment(5, 'basara'),
      'field-6': assignment(6, 'basara'),
      'bench-1': assignment(7, 'hero'),
      'bench-2': assignment(8, 'basara'),
    },
  };
  alerts = teamAlerts(team, formation);
  assert.deepEqual(alerts.find((a) => a.code === 'hero-limit')?.slots, [
    'field-2',
    'field-3',
    'field-4',
  ]);
  assert.deepEqual(alerts.find((a) => a.code === 'basara-limit')?.slots, ['field-5', 'field-6']);
  assert.equal(playerWarning(alerts, 'bench-1'), null);
  assert.equal(playerWarning(alerts, 'bench-2'), null);
});

test('a selected archetype survives save, move and undo without changing the catalogue player', () => {
  const original = putPlayer(emptyTeam(), 'field-6', assignment(1));
  const changed = putPlayer(original, 'field-6', {
    ...original.slots['field-6']!,
    playStyle: 'justice',
  });
  assert.equal(changed.slots['field-6']?.player.playStyle, 'bond');
  assert.equal(changed.slots['field-6']?.playStyle, 'justice');
  const storage = memoryStorage();
  saveTeam(storage, changed);
  assert.equal(readTeams(storage)[0]?.team.slots['field-6']?.playStyle, 'justice');
  assert.equal(movePlayer(changed, 'field-6', 'bench-1').slots['bench-1']?.playStyle, 'justice');
  const history = teamReducer(
    { past: [], present: original, future: [] },
    { type: 'change', team: changed },
  );
  assert.equal(
    teamReducer(history, { type: 'undo' }).present.slots['field-6']?.playStyle,
    undefined,
  );
  assert(decodeTeam(original));
  assert.equal(
    decodeTeam({
      ...changed,
      slots: { 'field-6': { ...changed.slots['field-6'], playStyle: 'unknown' } },
    }),
    null,
  );
});
test('rarity stats keep partial values for the profile while excluding them from team power', () => {
  const partial = {
    ...player(1),
    profiles: [
      { ...player(1).profiles[0]!, values: { ...player(1).profiles[0]!.values, power: null } },
    ],
  };
  const selected = { player: partial, rarity: 'legendary' as const };
  assert.equal(assignmentStats(selected)?.values.power, null);
  assert.equal(assignmentStats(selected)?.values.control, 168);
  assert.equal(baseStats(selected), null);
  assert.equal(partial.profiles[0]?.values.control, 120);
  assert.equal(assignmentStats(assignment(1, 'hero'))?.values.power, 110);
  assert.equal(assignmentStats(assignment(1, 'basara')), null);
});

test('Hero colors follow every archetype and the selected override takes precedence', () => {
  for (const [style, expected] of [
    ['breach', '#f472b6'],
    ['counter', '#f472b6'],
    ['justice', '#cbd5e1'],
    ['bond', '#cbd5e1'],
    ['rough_play', '#eb0000'],
    ['tension', '#eb0000'],
  ] as const) {
    assert.equal(rarityAppearance('hero', style).color, expected);
  }
  const hero = {
    ...assignment(1, 'hero'),
    player: { ...player(1), playStyle: 'justice' as const },
    playStyle: 'breach' as const,
  };
  assert.equal(assignmentAppearance(hero).color, '#f472b6');
  assert.equal(assignmentAppearance({ ...hero, playStyle: undefined }).color, '#cbd5e1');
  assert.deepEqual(
    rarityAppearance('legendary', 'justice'),
    rarityAppearance('legendary', 'tension'),
  );
  assert.equal(rarityAppearance('hero', 'tension').shadow, '#eb00004d');
});
test('clearing a team removes every slot, keeps its identity and can be undone', () => {
  let team = { ...emptyTeam(), name: 'Hakuren', formation: '4-4-2-diamond' };
  team = putPlayer(team, 'field-1', assignment(1, 'hero'));
  team = putPlayer(team, 'bench-1', assignment(2, 'basara'));
  team = putPlayer(team, 'coach', { player: player(3, 'Manager'), rarity: 'legendary' });
  team = putPlayer(team, 'manager-1', { player: player(4, 'Coordinator'), rarity: 'legendary' });
  const empty = clearTeam(team);
  assert.deepEqual(empty.slots, {});
  assert.equal(empty.id, team.id);
  assert.equal(empty.name, team.name);
  assert.equal(empty.formation, team.formation);
  assert.equal(Object.keys(team.slots).length, 4);
  assert.deepEqual(teamCounts(empty), { starters: 0, heroes: 0, basaras: 0 });
  const state = teamReducer(
    { past: [], present: team, future: [] },
    { type: 'change', team: empty },
  );
  assert.deepEqual(teamReducer(state, { type: 'undo' }).present, team);
  assert.equal(clearTeam(empty), empty);
});
