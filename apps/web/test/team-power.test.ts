import { catalogueName } from '../src/features/catalogue/lib/catalogue-text.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { CatalogueItem, LoadoutOptions, Passive, StatKey } from '../../../shared/catalogue.js';
import {
  emptyTeam,
  putPlayer,
  movePlayer,
  teamPower,
  teamReducer,
  type Assignment,
  type Team,
} from '../src/features/team-builder/lib/team.ts';
import { passiveEffect } from '../src/features/team-builder/lib/passive-effects.ts';
function player(id = 1): Assignment {
  return {
    rarity: 'common',
    player: {
      id,
      name: `Player ${id}`,
      portraitUrl: null,
      position: 'FW',
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
function gear(
  id: number,
  slot: CatalogueItem['slot'],
  stats: Partial<Record<StatKey, number>>,
): CatalogueItem {
  return {
    id,
    section: 'equipment',
    gameId: String(id),
    stringId: String(id),
    name: 'Equipment',
    description: null,
    slot,
    imageUrl: null,
    tension: null,
    stats,
    sourceUrl: null,
  };
}
function passive(id: number, name: string): Passive {
  return {
    id,
    name,
    description: name,
    gameId: String(id),
    stringId: String(id),
    source: 'player',
    playStyle: null,
    value: 5,
    unit: name.includes('%') ? 'percent' : 'points',
    icon: null,
    family: null,
    tier: null,
    sourceUrl: null,
  };
}
function team(...assignments: Assignment[]): Team {
  return assignments.reduce(
    (current, assignment, index) => putPlayer(current, `field-${index + 1}`, assignment),
    emptyTeam(),
  );
}
const catalogue = (equipment: CatalogueItem[] = [], passives: Passive[] = []): LoadoutOptions => ({
  equipment,
  passives,
});
test('equipment adds each stat after rarity scaling and before every derived power calculation', () => {
  const original = player();
  original.rarity = 'legendary';
  original.equipment = { boots: 1, pendant: 2, bracelet: 3, accessory: 4 };
  const items = [
    gear(1, 'boots', { power: 10 }),
    gear(2, 'pendant', { control: 5 }),
    gear(3, 'bracelet', { pressure: 4, physical: 3 }),
    gear(4, 'accessory', { agility: 2, intelligence: 1 }),
  ];
  const result = teamPower(team(original), catalogue(items));
  assert.deepEqual(result.totals, {
    shootAT: 295,
    focusAT: 360,
    focusDF: 352,
    wallDF: 287,
    scrambleAT: 284,
    scrambleDF: 285,
    kp: 1285,
  });
  assert.deepEqual(result.potential, result.totals);
  assert.equal(original.player.profiles[0]?.values.power, 100);
  assert.equal(result.unavailable, 0);
});
test('flat passives raise base stats before percentages and use the selected custom value', () => {
  const member = player();
  member.equipment = { boots: 1 };
  member.passives = [
    { id: 1, value: 7 },
    { id: 2, value: 10 },
  ];
  const data = catalogue(
    [gear(1, 'boots', { power: 10, control: 5 })],
    [passive(1, 'Frappe +…'), passive(2, 'ATT des tirs +… % pour les joueurs du même élément')],
  );
  const result = teamPower(team(member), data);
  assert.equal(result.totals.shootAT, 244);
  assert.equal(result.totals.focusAT, 264);
  assert.equal(result.totals.focusDF, 250);
  assert.equal(result.totals.kp, 900);
});
test('percentage effects stack additively, round per player and leave unrelated powers unchanged', () => {
  const first = player(1);
  const second = player(2);
  first.passives = [
    { id: 1, value: 10 },
    { id: 1, value: 5 },
  ];
  const data = catalogue([], [passive(1, 'ATT des tirs +… % pour les joueurs du même élément')]);
  assert.equal(teamPower(team(first, second), data).totals.shootAT, 460);
  first.player.profiles[0]!.values.control = 101;
  second.player.profiles[0]!.values.control = 101;
  first.passives = [{ id: 1, value: 0.25 }];
  assert.equal(teamPower(team(first, second), data).totals.shootAT, 404);
  assert.equal(teamPower(team(first, second), data).totals.wallDF, 400);
});
test('element and position scopes affect only matching starters including their carrier', () => {
  const first = player(1);
  const second = player(2);
  second.player.position = 'DF';
  const third = player(3);
  third.player.element = 'fire';
  first.passives = [{ id: 1, value: 50 }];
  const data = catalogue([], [passive(1, 'ATT des tirs +… % pour les joueurs du même élément')]);
  assert.equal(teamPower(team(first, second, third), data).totals.shootAT, 800);
  data.passives[0]!.name = "ATT des tirs +… % pour les joueurs d'éléments différents";
  assert.equal(teamPower(team(first, second, third), data).totals.shootAT, 700);
  third.player.element = null;
  assert.equal(teamPower(team(first, second, third), data).totals.shootAT, 600);
  data.passives[0]!.name = 'ATT des tirs +… % pour les joueurs de la même position';
  assert.equal(teamPower(team(first, second, third), data).totals.shootAT, 800);
  data.passives[0]!.name = 'ATT des tirs +… % pour les joueurs à des positions différentes';
  assert.equal(teamPower(team(first, second, third), data).totals.shootAT, 700);
});
test('staff team passives apply to starters while bench stats, gear and passives stay inactive', () => {
  const first = player(1);
  const second = player(2);
  const coach = player(3);
  coach.player.role = 'Manager';
  coach.passives = [{ id: 1, value: 10 }];
  coach.equipment = { boots: 1 };
  const substitute = player(4);
  substitute.equipment = { boots: 1 };
  substitute.passives = [{ id: 1, value: 100 }];
  let current = team(first, second);
  current = putPlayer(current, 'coach', coach);
  const manager = player(5);
  manager.player.role = 'Coordinator';
  manager.passives = [{ id: 1, value: 5 }];
  current = putPlayer(current, 'manager-1', manager);
  current = putPlayer(current, 'bench-1', substitute);
  const data = catalogue([gear(1, 'boots', { power: 100 })], [passive(1, "PG de l'équipe +… %")]);
  assert.equal(teamPower(current, data).totals.shootAT, 400);
  assert.equal(teamPower(current, data).totals.kp, 2070);
  assert.equal(teamPower(movePlayer(current, 'bench-1', 'field-1'), data).totals.shootAT, 500);
});
test('conditional passives are projected separately and official caps apply to each effect family', () => {
  const member = player();
  member.passives = [
    { id: 1, value: 150 },
    { id: 1, value: 150 },
    { id: 2, value: 200 },
  ];
  const data = catalogue(
    [],
    [
      passive(1, "Quand la tension est à 100%, ATT des tirs de l'équipe +… %"),
      passive(
        2,
        "Après récupération du ballon (sauf arrêt), ATT des tirs de l'équipe +… % pendant 30 sec",
      ),
    ],
  );
  const result = teamPower(team(member), data);
  assert.equal(result.totals.shootAT, 200);
  assert.equal(result.potential.shootAT, 800);
  assert.equal(result.potential.focusAT, 250);
});
test('incompatible halves are not added together in conditional projections', () => {
  const member = player();
  member.passives = [
    { id: 1, value: 20 },
    { id: 2, value: 30 },
  ];
  const data = catalogue(
    [],
    [
      passive(1, 'ATT & DÉF affrontement (perso) +… % dans sa moitié de terrain'),
      passive(2, 'ATT & DÉF affrontement (perso) +… % dans la moitié de terrain adverse'),
    ],
  );
  const result = teamPower(team(member), data);
  assert.equal(result.totals.focusAT, 250);
  assert.equal(result.potential.focusAT, 325);
});
test('recovery position restrictions and nearby-element conditions do not invent eligible players', () => {
  const forward = player(1);
  const midfield = player(2);
  midfield.player.position = 'MF';
  forward.passives = [
    { id: 1, value: 20 },
    { id: 2, value: 20 },
  ];
  const data = catalogue(
    [],
    [
      passive(
        1,
        'Après récupération du ballon (sauf arrêt), ATT & DÉF affrontement [MIL] +… % pendant 30 sec',
      ),
      passive(2, 'Quand un joueur du même élément est proche, ATT des tirs (perso) +… %'),
    ],
  );
  const alone = teamPower(team(forward), data);
  assert.equal(alone.potential.focusAT, 250);
  assert.equal(alone.potential.shootAT, 200);
  const together = teamPower(team(forward, midfield), data);
  assert.equal(together.potential.focusAT, 550);
  assert.equal(together.potential.shootAT, 440);
  assert.equal(together.totals.shootAT, 400);
});
test('a starter with missing base stats can still satisfy another player’s nearby-element condition', () => {
  const first = player(1);
  first.passives = [{ id: 1, value: 20 }];
  const second = player(2);
  second.player.profiles = [];
  const result = teamPower(
    team(first, second),
    catalogue(
      [],
      [passive(1, 'Quand un joueur du même élément est proche, ATT des tirs (perso) +… %')],
    ),
  );
  assert.equal(result.missing, 1);
  assert.equal(result.totals.shootAT, 200);
  assert.equal(result.potential.shootAT, 240);
});
test('gauges and effects requiring unconfigured match state are identified without inflating powers', () => {
  const member = player();
  member.passives = [
    { id: 1, value: 20 },
    { id: 2, value: 5 },
    { id: 3, value: 10 },
  ];
  const data = catalogue(
    [],
    [
      passive(1, "Taux de brèche de l'équipe +… %"),
      passive(2, "Chaque 1% puiss. de lien qui augmente (Build Lien), ATT & DÉF de l'équipe +… %"),
      passive(3, 'Future unknown effect'),
    ],
  );
  const result = teamPower(team(member), data);
  assert.equal(result.gauges, 1);
  assert.equal(result.matchState, 1);
  assert.equal(result.unresolved, 1);
  assert.equal(result.totals.shootAT, 200);
  assert.deepEqual(result.potential, result.totals);
  assert.equal(passiveEffect('Contrôle +…')?.kind, 'flat');
});
test('missing catalogue entries and incomplete base stats are reported without substituting bonuses for real stats', () => {
  const member = player();
  member.equipment = { boots: 1 };
  member.passives = [{ id: 99, value: 10 }];
  const result = teamPower(team(member), catalogue([gear(1, 'pendant', { power: 100 })]));
  assert.equal(result.unavailable, 2);
  assert.equal(result.totals.shootAT, 200);
  member.player.profiles[0]!.values.power = null;
  const missing = teamPower(team(member), catalogue());
  assert.equal(missing.missing, 1);
  assert.equal(missing.totals.shootAT, 0);
});
test('undo restores the previous equipment and passive contribution immediately', () => {
  const before = team(player());
  const member = {
    ...before.slots['field-1']!,
    equipment: { boots: 1 },
    passives: [{ id: 1, value: 50 }],
  };
  const after = putPlayer(before, 'field-1', member);
  const history = teamReducer(
    { past: [], present: before, future: [] },
    { type: 'change', team: after },
  );
  const data = catalogue(
    [gear(1, 'boots', { power: 10 })],
    [passive(1, 'ATT des tirs +… % pour les joueurs du même élément')],
  );
  assert.equal(teamPower(history.present, data).totals.shootAT, 315);
  assert.equal(teamPower(teamReducer(history, { type: 'undo' }).present, data).totals.shootAT, 200);
});

test('localized passive labels never change equipment selection or computed power', () => {
  const member = player();
  member.passives = [{ id: 1, value: 10 }];
  const effect = passive(1, 'ATT des tirs +… % pour les joueurs du même élément');
  effect.translations = {
    en: { name: 'Shot ATK +… % for same-element players', description: null },
  };
  const data = catalogue([], [effect]);
  const current = team(member);
  const before = teamPower(current, data);
  assert.equal(catalogueName(effect, 'en'), 'Shot ATK +… % for same-element players');
  assert.equal(effect.name, 'ATT des tirs +… % pour les joueurs du même élément');
  assert.deepEqual(teamPower(current, data), before);
});
