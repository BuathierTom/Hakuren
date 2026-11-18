import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  PlayerDetail,
  PlayerForm,
  PlayerLearnset,
  PlayerStatProfile,
} from '../../../shared/catalogue.js';
import {
  playerForms,
  playerMoves,
  playerStats,
} from '../src/features/catalogue/lib/player-forms.js';

function fixture() {
  const move = (id: number, rarity: PlayerForm, alternatePath = false): PlayerLearnset => ({
    id,
    technique: { id, name: `Technique ${id}`, category: 'shoot', element: 'fire' },
    work: { id: 1, code: 'VR', name: 'Victory Road', kind: 'game' },
    mode: 'standard',
    version: 'unspecified',
    formLabel: null,
    level: id,
    evolution: null,
    alternatePath,
    basaraOnly: rarity === 'basara',
    rarityScope: rarity === 'common' ? 'unknown' : 'restricted',
    rarities: rarity === 'common' ? [] : [{ code: rarity, name: rarity }],
  });
  const profile = (rarity: PlayerForm, level: number, power: number): PlayerStatProfile => ({
    rarity,
    level,
    values: {
      power,
      control: 100,
      technique: 100,
      pressure: 100,
      physical: 100,
      agility: 100,
      intelligence: 100,
    },
  });
  return {
    rarities: [{ code: 'hero', name: 'HERO' }],
    statistics: null,
    statProfiles: [
      profile('common', 50, 100),
      profile('common', 99, 150),
      profile('hero', 99, 180),
    ],
    learnsets: [move(1, 'common'), move(2, 'common', true), move(3, 'hero'), move(4, 'basara')],
  } as PlayerDetail;
}

test('player forms only expose available rarities and select the highest documented level', () => {
  const player = fixture();
  assert.deepEqual(playerForms(player), ['common', 'hero']);
  assert.equal(playerStats(player, 'common')?.values.power, 150);
  assert.equal(playerStats(player, 'hero')?.values.power, 180);
  assert.equal(playerStats(player, 'basara'), null);
});

test('common techniques and alternative branches stay separate from HERO and BASARA learnsets', () => {
  const player = fixture();
  assert.deepEqual(
    playerMoves(player, 'common').map((move) => move.id),
    [1, 2],
  );
  assert.equal(playerMoves(player, 'common')[1]?.alternatePath, true);
  assert.deepEqual(
    playerMoves(player, 'hero').map((move) => move.id),
    [3],
  );
  assert.deepEqual(
    playerMoves(player, 'basara').map((move) => move.id),
    [4],
  );
  player.learnsets[0]!.work.code = 'IE';
  assert.deepEqual(
    playerMoves(player, 'common').map((move) => move.id),
    [2],
  );
});
