import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareExtras } from '../src/catalogue/extras.js';
import { teamBadgeFiles } from '../src/catalogue/team-badges.js';
import { extrasResources } from './helpers/extras.js';
import { buildApp } from '../src/app.js';
import type { CatalogueRepository } from '../src/catalogue/repository.js';

test('French passives preserve exact values, distinguish catalogues and remove game markup and placeholders', () => {
  const extras = prepareExtras(extrasResources());
  assert.equal(extras.passives.length, 5);
  const preset = extras.passives[0]!;
  assert.equal(preset.value, 1.2);
  assert.equal(preset.description, 'ATT +1,2 % pour les alliés');
  assert.equal(preset.name, 'ATT +… % pour les alliés');
  assert.equal(preset.family, 1);
  assert.equal(preset.playStyle, 'breach');
  assert.deepEqual(
    extras.passives.map((p) => p.source),
    ['player', 'player', 'custom', 'coach', 'manager'],
  );
  assert.equal(extras.passives[2]!.unit, 'points');
  assert.equal(extras.passives[2]!.icon, 0);
  assert.equal(extras.passives[3]!.value, 3.5);
});
test('team badges follow redirects and prefer emblems without using team photographs', () => {
  const resources = extrasResources();
  const candidate = teamBadgeFiles(resources).find((b) => b.name === 'Test Team');
  assert.equal(candidate?.file, 'File:Équipe test emblem (VR).png');
  const result = prepareExtras(resources).badges.find((b) => b.name === 'Test Team');
  assert.equal(
    result?.imageUrl,
    'https://static.wikia.nocookie.net/inazuma-eleven/images/test/logo.png',
  );
  resources.delete('wiki-team-images-1');
  assert.equal(prepareExtras(resources).badges.length, 0);
});
test('passives and historical teams validate their own filters and handle missing catalogues', async () => {
  const empty = { items: [], total: 0, pages: 0, page: 1, limit: 24 };
  const repository = {
    passives: async () => empty,
    teams: async () => empty,
    passive: async () => null,
    team: async () => null,
    loadouts: async () => ({ equipment: [], passives: [] }),
  } as unknown as CatalogueRepository;
  const app = buildApp({ catalogue: repository });
  const missing = buildApp();
  try {
    for (const path of [
      '/api/passives?source=custom&style=breach',
      '/api/teams?work=IE2&q=Zeus',
      '/api/catalogue/loadouts',
    ])
      assert.equal((await app.inject(path)).statusCode, 200, path);
    for (const path of [
      '/api/passives?source=fake',
      '/api/passives?style=fake',
      '/api/passives?work=IE',
      '/api/teams?source=player',
      '/api/teams?limit=49',
      '/api/passives/0',
      '/api/teams/not-a-number',
    ])
      assert.equal((await app.inject(path)).statusCode, 400, path);
    for (const path of ['/api/passives/123', '/api/teams/123'])
      assert.equal((await app.inject(path)).statusCode, 404, path);
    for (const path of ['/api/passives', '/api/teams', '/api/catalogue/loadouts'])
      assert.equal((await missing.inject(path)).statusCode, 503, path);
  } finally {
    await app.close();
    await missing.close();
  }
});

test('English passive texts preserve placeholders and leave canonical effect names unchanged', () => {
  const passive = prepareExtras(extrasResources()).passives[0]!;
  assert.equal(passive.name, 'ATT +… % pour les alliés');
  assert.deepEqual(passive.translations, {
    fr: { name: 'ATT +… % pour les alliés', description: 'ATT +1,2 % pour les alliés' },
    en: { name: 'ATK +… % for allies', description: 'ATK +1.2 % for allies' },
  });
});
