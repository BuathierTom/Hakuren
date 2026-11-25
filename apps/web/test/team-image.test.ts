import assert from 'node:assert/strict';
import test from 'node:test';
import type { Assignment, Team } from '../../../shared/teams.js';
import type { Formation } from '../../../shared/formations.js';
import type { LoadoutOptions } from '../../../shared/catalogue.js';
import { hasTeamLoadout } from '../src/features/team-builder/lib/loadouts.ts';
import {
  teamImageFilename,
  teamImageModel,
} from '../src/features/team-builder/lib/team-image/model.ts';

const formation: Formation = {
  id: 1,
  code: 'test',
  name: 'Test',
  positions: [{ slot: 1, position: 'FW', x: 50, y: 100 }],
};
function assignment(id: number): Assignment {
  const values = {
    power: 100,
    control: 100,
    technique: 100,
    pressure: 100,
    physical: 100,
    agility: 100,
    intelligence: 100,
  };
  return {
    rarity: 'common',
    player: {
      id,
      name: 'Mark Evans',
      portraitUrl: null,
      position: 'FW',
      element: 'wind',
      role: 'Player',
      gender: 'male',
      playStyle: 'breach',
      rarities: ['common', 'hero', 'basara'],
      profiles: ['common', 'hero', 'basara'].map((rarity) => ({ rarity, level: 99, values })),
    },
  };
}
const team = (slots: Team['slots']): Team => ({
  id: 'export-team',
  name: 'Les Éclairs',
  formation: 'test',
  slots,
});

test('PNG filenames retain readable names and remove path separators and unsafe punctuation', () => {
  assert.equal(teamImageFilename('Les Éclairs / Zeus !'), 'hakuren-les-eclairs-zeus.png');
  assert.equal(teamImageFilename(' ../ '), 'hakuren-mon-equipe.png');
  assert.equal(teamImageFilename('   '), 'hakuren-mon-equipe.png');
  assert(teamImageFilename('É'.repeat(150)).length <= 92);
});

test('export analysis includes equipment and passive bonuses and excludes bench statistics', () => {
  const starter = assignment(1);
  starter.equipment = { boots: 1 };
  starter.passives = [{ id: 2, value: 10 }];
  const data: LoadoutOptions = {
    equipment: [
      {
        id: 1,
        name: 'Boots',
        section: 'equipment',
        gameId: '1',
        stringId: 'boots',
        description: null,
        slot: 'boots',
        imageUrl: null,
        tension: null,
        stats: { power: 20 },
        sourceUrl: null,
      },
    ],
    passives: [
      {
        id: 2,
        name: 'ATT des tirs +… % pour les joueurs du même élément',
        description: 'ATT des tirs +… % pour les joueurs du même élément',
        gameId: '2',
        stringId: 'passive',
        source: 'player',
        playStyle: null,
        value: 10,
        unit: 'percent',
        icon: null,
        family: null,
        tier: null,
        sourceUrl: null,
      },
    ],
  };
  const current = team({ 'field-1': starter, 'bench-1': assignment(2) });
  const original = structuredClone(current);
  const model = teamImageModel(current, formation, data);
  assert.equal(model.power.totals.shootAT, 242);
  assert.equal(model.counts.starters, 1);
  assert.equal(model.offPosition, 0);
  assert.deepEqual(current, original);
  assert(hasTeamLoadout(current));
  assert(!hasTeamLoadout(team({ 'bench-1': starter })));
});

test('export analysis retains off-position alerts and counts special rarities on the field only', () => {
  const hero = { ...assignment(1), rarity: 'hero' as const };
  hero.player.position = 'GK';
  const current = team({
    'field-1': hero,
    'field-2': { ...assignment(2), rarity: 'basara' },
    'bench-1': { ...assignment(3), rarity: 'hero' },
  });
  const model = teamImageModel(current, formation);
  assert.deepEqual(model.counts, { starters: 2, heroes: 1, basaras: 1 });
  assert.equal(model.offPosition, 1);
  assert(model.alerts.some((alert) => alert.message.includes('GAR → ATT')));
});
