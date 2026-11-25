import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  CatalogueItem,
  LoadoutOptions,
  Passive,
  Position,
  StatKey,
} from '../../../shared/catalogue.js';
import type { Formation } from '../../../shared/formations.js';
import { fillTeamLoadouts } from '../src/features/team-builder/lib/auto-loadouts.ts';
import { groupedPassives, hasEmptyLoadouts } from '../src/features/team-builder/lib/loadouts.ts';
import {
  emptyTeam,
  teamReducer,
  type Assignment,
  type Team,
} from '../src/features/team-builder/lib/team.ts';

const formation: Formation = {
  id: 1,
  code: 'test',
  name: 'Test',
  positions: [
    { slot: 1, position: 'GK', x: 50, y: 90 },
    { slot: 2, position: 'DF', x: 50, y: 70 },
    { slot: 3, position: 'MF', x: 50, y: 50 },
    { slot: 4, position: 'FW', x: 50, y: 20 },
  ],
};
function player(id: number, position: Position = 'FW'): Assignment {
  return {
    rarity: 'legendary',
    player: {
      id,
      name: `Player ${id}`,
      position,
      portraitUrl: null,
      element: 'wind',
      gender: 'male',
      playStyle: 'breach',
      role: 'Player',
      rarities: ['common', 'legendary'],
      profiles: [
        {
          rarity: 'common',
          level: 99,
          values: {
            power: 100,
            control: 100,
            technique: 100,
            pressure: 100,
            physical: 100,
            agility: 100,
            intelligence: 100,
          },
        },
      ],
    },
  };
}
function team(slots: Team['slots']): Team {
  return { ...emptyTeam(), formation: formation.code, slots };
}
function gear(
  id: number,
  slot: CatalogueItem['slot'],
  stats: Partial<Record<StatKey, number>>,
): CatalogueItem {
  return {
    id,
    slot,
    stats,
    section: 'equipment',
    gameId: String(id),
    stringId: String(id),
    name: `Gear ${id}`,
    description: null,
    imageUrl: null,
    tension: null,
    sourceUrl: null,
  };
}
function passive(id: number, name: string, options: Partial<Passive> = {}): Passive {
  return {
    id,
    name,
    description: name,
    gameId: String(id),
    stringId: String(id),
    source: 'player',
    playStyle: null,
    value: 10,
    unit: 'percent',
    icon: null,
    family: id,
    tier: 0,
    sourceUrl: null,
    ...options,
  };
}
function catalogue(equipment: CatalogueItem[] = [], passives: Passive[] = []): LoadoutOptions {
  return { equipment, passives };
}
const shot = 'ATT des tirs +… % pour les joueurs du même élément';
const wall = 'DÉF des Remparts +… % pour les joueurs du même élément';
const focus = 'ATT & DÉF affrontement +… % pour les joueurs du même élément';
const kp = "PG de l'équipe +… %";

test('equipment follows formation positions and uses the natural position for substitutes', () => {
  const original = team({
    'field-1': player(1),
    'field-4': player(2, 'GK'),
    'bench-1': player(3, 'GK'),
  });
  const before = structuredClone(original);
  const data = catalogue([
    gear(1, 'boots', { power: 50 }),
    gear(2, 'boots', { agility: 50 }),
    gear(3, 'boots', { technique: 50 }),
  ]);
  const next = fillTeamLoadouts(original, formation, data);
  assert.equal(next.slots['field-1']!.equipment!.boots, 2);
  assert.equal(next.slots['field-4']!.equipment!.boots, 1);
  assert.equal(next.slots['bench-1']!.equipment!.boots, 2);
  assert.deepEqual(original, before);
  assert.equal(next.id, original.id);
  assert.equal(next.name, original.name);
  assert.equal(next.formation, original.formation);
  assert.equal(next.slots['field-1']!.player, original.slots['field-1']!.player);
});

test('passive choices favor the powers used by each post over large unrelated values', () => {
  const original = team({
    'field-1': player(1, 'GK'),
    'field-2': player(2, 'DF'),
    'field-3': player(3, 'MF'),
    'field-4': player(4),
  });
  const data = catalogue(
    [],
    [
      passive(1, kp),
      passive(2, wall),
      passive(3, focus),
      passive(4, shot),
      passive(5, "Taux de chute de l'équipe +… % (Rare)", { value: 9999 }),
    ],
  );
  const next = fillTeamLoadouts(original, formation, data);
  assert.equal(next.slots['field-1']!.passives![0]!.id, 1);
  assert.equal(next.slots['field-2']!.passives![0]!.id, 2);
  assert.equal(next.slots['field-3']!.passives![0]!.id, 3);
  assert.equal(next.slots['field-4']!.passives![0]!.id, 4);
});

test('selected archetype, rarity tiers, sources and passive families are respected', () => {
  const member = player(1);
  member.rarity = 'common';
  member.playStyle = 'tension';
  const data = catalogue(
    [],
    [
      passive(1, shot, { family: 10, tier: 0 }),
      passive(2, shot, { family: 10, tier: 4, value: 90 }),
      passive(3, shot, { playStyle: 'breach', value: 99 }),
      passive(4, shot, { playStyle: 'tension', value: 15 }),
      passive(5, shot, { source: 'custom', playStyle: 'tension', value: 30 }),
      passive(6, shot, { family: 10, source: 'custom', value: 99 }),
      passive(7, shot, { source: 'coach', value: 99 }),
      passive(8, shot, { tier: 4, value: 99 }),
    ],
  );
  const next = fillTeamLoadouts(team({ 'field-4': member }), formation, data).slots['field-4']!;
  assert.deepEqual(
    next.passives!.map((p) => p?.id ?? null),
    [4, 1, null, null, null, 5],
  );
  assert.equal(next.passives![5]!.value, 30);
  assert.deepEqual(groupedPassives([data.passives[7]!], 'player', 'common'), []);
});

test('the sixth player row uses custom passives while every staff row uses its staff source', () => {
  const coach = player(3);
  coach.player.role = 'Manager';
  const manager = player(4);
  manager.player.role = 'Coordinator';
  const data = catalogue(
    [],
    [
      ...Array.from({ length: 5 }, (_, i) => passive(i + 1, shot)),
      passive(10, shot, { source: 'custom' }),
      ...Array.from({ length: 6 }, (_, i) => passive(i + 20, kp, { source: 'coach' })),
      ...Array.from({ length: 6 }, (_, i) => passive(i + 30, kp, { source: 'manager' })),
    ],
  );
  const next = fillTeamLoadouts(
    team({ 'field-4': player(1), 'bench-1': player(2), coach, 'manager-1': manager }),
    formation,
    data,
  );
  const byId = new Map(data.passives.map((p) => [p.id, p]));
  for (const slot of ['field-4', 'bench-1']) {
    assert.equal(next.slots[slot]!.passives!.filter(Boolean).length, 6);
    assert.equal(byId.get(next.slots[slot]!.passives![5]!.id)!.source, 'custom');
  }
  for (const [slot, source] of [
    ['coach', 'coach'],
    ['manager-1', 'manager'],
  ]) {
    const selected = next.slots[slot!]!.passives!;
    assert.equal(selected.filter(Boolean).length, 6);
    assert(selected.every((p) => byId.get(p!.id)!.source === source));
  }
});

test('manual selections and values survive, filling is deterministic, and one undo restores everything', () => {
  const member = player(1);
  member.equipment = { boots: 99 };
  member.passives = [{ id: 50, value: 3.5 }];
  const original = team({ 'field-4': member, 'bench-1': player(2) });
  const before = structuredClone(original);
  const data = catalogue(
    [
      gear(1, 'boots', { power: 50 }),
      gear(2, 'pendant', { control: 10 }),
      gear(3, 'bracelet', { physical: 10 }),
      gear(4, 'accessory', { technique: 10 }),
    ],
    [
      passive(50, shot),
      ...Array.from({ length: 5 }, (_, i) => passive(i + 60, shot)),
      passive(70, shot, { source: 'custom' }),
    ],
  );
  const next = fillTeamLoadouts(original, formation, data);
  assert.equal(next.slots['field-4']!.equipment!.boots, 99);
  assert.deepEqual(next.slots['field-4']!.passives![0], { id: 50, value: 3.5 });
  assert(!hasEmptyLoadouts(next));
  assert.deepEqual(original, before);
  assert.equal(fillTeamLoadouts(next, formation, data), next);
  assert.deepEqual(
    fillTeamLoadouts(original, formation, {
      equipment: [...data.equipment].reverse(),
      passives: [...data.passives].reverse(),
    }),
    next,
  );
  const history = teamReducer(
    { past: [], present: original, future: [] },
    { type: 'change', team: next },
  );
  assert.equal(history.past.length, 1);
  assert.deepEqual(teamReducer(history, { type: 'undo' }).present, original);
});

test('staff chooses a useful team buff when an equivalent percentage targets no starters', () => {
  const coach = player(2);
  coach.player.element = 'fire';
  coach.player.role = 'Manager';
  const data = catalogue(
    [],
    [
      passive(1, shot, { source: 'coach', value: 100 }),
      passive(2, kp, { source: 'coach', value: 5 }),
    ],
  );
  const next = fillTeamLoadouts(team({ 'field-1': player(1, 'GK'), coach }), formation, data);
  assert.equal(next.slots.coach!.passives![0]!.id, 2);
});

test('an already capped conditional buff yields to a passive with an actual marginal gain', () => {
  const member = player(1);
  member.passives = [{ id: 1, value: 200 }];
  const capped = "Quand la tension est à 100%, ATT des tirs de l'équipe +… %";
  const data = catalogue(
    [],
    [passive(1, capped), passive(2, capped, { value: 200 }), passive(3, shot, { value: 5 })],
  );
  const next = fillTeamLoadouts(team({ 'field-4': member }), formation, data);
  assert.equal(next.slots['field-4']!.passives![1]!.id, 3);
});

test('empty teams and missing catalogues preserve the existing composition', () => {
  const empty = team({});
  assert.equal(fillTeamLoadouts(empty, formation, catalogue()), empty);
  assert(!hasEmptyLoadouts(empty));
  const original = team({ 'field-4': player(1) });
  assert.equal(fillTeamLoadouts(original, formation, catalogue()), original);
});
