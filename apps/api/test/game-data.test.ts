import assert from 'node:assert/strict';
import test from 'node:test';
import { fixtureGamePlan } from './helpers/catalogue.js';
import { gameCharacterId } from '../src/catalogue/official.js';

test('game data localizes signed identities, preserves legacy links and includes auras without passive records', async () => {
  const plan = await fixtureGamePlan();
  const move = plan.techniques.find((row) => row.gameId === '221679467');
  assert.equal(move?.name, 'Tir français');
  assert.equal(plan.variants[2]?.playStyle?.code, 'justice');
  assert.equal(move?.key, 'Test Shot');
  assert.equal(move?.legacyKey?.external, 'technique/Test Shot');
  assert.equal(move?.power, 85);
  assert.equal(move?.tension, 80);
  assert.deepEqual(move?.notes, ['CD 60']);
  assert.equal(move?.description, 'Une frappe\npuissante.');
  const aura = plan.techniques.find((row) => row.gameId === '-72');
  assert.equal(aura?.category, 'keshin');
  assert.equal(aura?.power, null);
  assert.equal(aura?.grantedGameId, '221679467');
  assert(!plan.techniques.some((row) => row.gameId === '444' || row.category === 'passive'));
  assert(
    plan.learnsets
      .filter((row) => row.record.source === 'kizuna-game-data')
      .every((row) => row.externalId === '900003'),
  );
  assert.equal(plan.items?.filter((row) => row.section === 'equipment').length, 1);
  assert.equal(plan.items?.filter((row) => row.section === 'tactics').length, 1);
  assert.equal(plan.items?.find((row) => row.section === 'tactics')?.tension, 2.5);
  assert.deepEqual(plan.items?.find((row) => row.section === 'equipment')?.stats, {
    power: 5,
    physical: 3,
  });
});

test('the codex character identity is independent from its displayed roster number', () => {
  const payload = Buffer.from(JSON.stringify({ character_id: ['c01000010'] }));
  const encoded = Buffer.from(payload.map((value) => value ^ 255)).toString('base64url');
  assert.equal(
    gameCharacterId(`<a href="/en/chara_model_view/?q=${encoded}">Mark</a>`),
    'c01000010',
  );
  assert.equal(gameCharacterId('<a href="/en/chara_model_view/?q=invalid">'), null);
  assert.equal(gameCharacterId('<img src="https://example.test/p.png">'), null);
});

test('a known game category restores an unambiguous legacy video', async () => {
  const plan = await fixtureGamePlan(true);
  const shot = plan.techniques.find((row) => row.gameId === '221679467');
  assert.equal(shot?.category, 'shoot');
  assert.equal(shot?.key, 'Test Shot');
  assert.equal(shot?.preview, 'https://example.test/shot.mp4');
});

test('game element five is exposed as Void for techniques', async () => {
  const plan = await fixtureGamePlan(false, 5);
  assert.equal(plan.techniques.find((row) => row.gameId === '221679467')?.element, 'void');
});

test('game profiles preserve French descriptions and independent stats for every rarity and level', async () => {
  const plan = await fixtureGamePlan(false, 3, true);
  const profiles = plan.variants[2]!.statProfiles!;
  assert.equal(profiles.length, 6);
  assert.equal(
    profiles.find((profile) => profile.rarity === 'common' && profile.level === 99)?.values.power,
    150,
  );
  assert.equal(
    profiles.find((profile) => profile.rarity === 'hero' && profile.level === 99)?.values.power,
    180,
  );
  assert.equal(
    profiles.find((profile) => profile.rarity === 'basara' && profile.level === 99)?.values.power,
    210,
  );
  assert.equal(
    (profiles[0]!.record.payload as { description: string }).description,
    'Une description\nfrançaise.',
  );
});
