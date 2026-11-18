import type { Resource } from '../../src/catalogue/sources.js';
import { digest } from '../../src/catalogue/sources.js';
import { WORKS } from '../../src/catalogue/official.js';
import { prepareCatalogue, STATS } from '../../src/catalogue/prepare.js';

const icons = ['ie1', 'ie2', 'ie3', 'go1', 'go2', 'go3', 'ars', 'ori', 'vic'];
export function officialHtml(players: Record<string, unknown>[]) {
  const header = icons
    .map((icon) => `<th class="appearedWorks"><img src="icn_${icon}.png"></th>`)
    .join('');
  return `<table><tr>${header}</tr>${players
    .map((player) => {
      const cells = [
        `<input data-chara-id="asset-${player.ID}">`,
        player.ID,
        player.Name,
        player.Nickname,
        player.Game,
        player.Gender,
        player.Element,
        player.Position,
        player.Role,
        player['Age group'],
        player['School year'],
        'Test Team',
        '',
      ];
      return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr><tr>${icons.map((_, index) => `<td>${index === 0 || index === 8 ? '○' : '×'}</td>`).join('')}</tr>`;
    })
    .join('')}</table>`;
}

export function fixtureResources() {
  const players = Array.from({ length: 10 }, (_, index) => ({
    ID: 900_001 + index,
    Name: index < 2 ? 'Same name' : `Player ${index}`,
    Nickname: 'Alias',
    Game: WORKS[0][1],
    Gender: 'Male',
    Element: 'Wind',
    Position: 'MF',
    Role: 'Player',
    'Age group': 'Adult',
    'School year': '',
    Teams: ['Test Team'],
    Image: null,
    Obtain: [],
    Techniques: [],
    ...Object.fromEntries(STATS.map((stat) => [stat, 10])),
  }));
  const resources = new Map<string, Resource>();
  function add(id: string, value: unknown, html = false) {
    const body = html ? (value as string) : JSON.stringify(value);
    resources.set(id, {
      id,
      url: `https://example.test/${id}`,
      retrievedAt: '2026-01-01T00:00:00.000Z',
      sha256: digest(body),
      body,
    });
  }
  add('players', players);
  add('official-1', officialHtml(players.slice(0, 9)), true);
  add('techniques', [
    {
      Name: 'Test Shot',
      'Wiki name': 'Test Shot',
      Type: 'Shoot',
      Element: { GO: 'Forest', VR: 'Fire' },
      Power: 0,
      Cost: null,
    },
  ]);
  add('keshins', [
    { Name: 'Test Spirit', Element: 'Wind', KP: { GO: [10, 20] }, Attack: { GO: [5, 6] } },
  ]);
  add('mixmax', [{ Aura: 'Test Aura', Element: 'Mountain' }]);
  add('totems', [
    { Name: 'Test Totem', Element: 'Void', 'Galaxy stats': { Power: 30, Cost: 10, Damage: -5 } },
  ]);
  add('wiki-wazadata', {
    query: { pages: [{ revisions: [{ slots: { main: { content: 'local WAZAS={}' } } }] }] },
  });
  return resources;
}

export function fixturePlan() {
  const plan = prepareCatalogue(fixtureResources(), {
    families: [],
    mappings: [],
    memberships: [],
  });
  const record = {
    source: 'inazuma-wiki',
    kind: 'learnset',
    key: 'Fixture/Example/VRH',
    version: 'fixture-v1',
    url: 'https://example.test/moves',
    retrievedAt: '2026-01-01T00:00:00.000Z',
    payload: { variantId: 900_003 },
    status: 'verified' as const,
    note: null,
  };
  plan.records.push(record);
  plan.learnsets.push({
    externalId: '900003',
    technique: 'Test Shot',
    work: 'VR',
    mode: 'standard',
    version: 'unspecified',
    section: 'VRH',
    entryKey: 'VRH:TestShot:stable',
    level: 30,
    alternatePath: true,
    basaraOnly: false,
    rarityScope: 'restricted',
    rarities: ['hero'],
    flags: { NB: true, a: true },
    record,
  });
  return plan;
}

export async function fixtureGamePlan(unknownLegacy = false) {
  const { enrichGameData } = await import('../../src/catalogue/game-data.js');
  const plan = fixturePlan();
  if (unknownLegacy) {
    const shot = plan.techniques.find((row) => row.key === 'Test Shot')!;
    shot.category = null;
    shot.preview = 'https://example.test/shot.mp4';
  }
  plan.variants[2]!.official = { ...plan.variants[2]!.official, gameCharacterId: 'c01000010' };
  const resources = new Map<string, Resource>();
  for (const locale of ['fr', 'en', 'ja']) {
    const bundle = {
      lang: locale,
      game_version: 'fixture',
      hissatsu: [
        {
          id: 221679467,
          name: locale === 'fr' ? 'Tir français' : 'Test Shot',
          description: 'Une frappe\\npuissante.',
          category: 1,
          element: 3,
          power: 85,
          tp_consumption: 80,
          cooldown: 60,
        },
      ],
      aura_hissatsu: [],
      auras: [
        {
          id: -72,
          string_id: 'wk_test',
          name: locale === 'fr' ? 'Esprit français' : 'Test Spirit',
          type: 'keshin',
          element: 1,
          skill_id: 221679467,
        },
      ],
      equipment: [
        {
          id: 88,
          string_id: 'eq_test',
          name: locale === 'fr' ? 'Chaussures test' : 'Test Boots',
          slot: 'boots',
          stats: { kick: 5, physical: 3 },
        },
      ],
      tactics: [
        { id: 99, string_id: 'wht_test', name: 'Défense totale', tp_cost: 2.5 },
        { id: 100, string_id: 'wht_test_st01', name: 'Défense totale', tp_cost: 2.5 },
        { id: 101, string_id: 'test_cut', name: '必殺タクティクス名1', tp_cost: 99999 },
      ],
      characters: [
        {
          id: 42,
          character_id: 'c01000010',
          name: 'Player 2',
          main_position: 3,
          element: 1,
          skills: [
            [1, 221679467],
            [13, -72],
          ],
          skills_alt: [],
        },
      ],
      heroes: [],
      basaras: [],
      passives: [{ id: 444, name: 'Ne pas importer' }],
    };
    const body = '\uFEFF' + JSON.stringify(bundle);
    const id = `game-${locale}`;
    resources.set(id, {
      id,
      body,
      sha256: digest(body),
      url: `https://example.test/${id}`,
      retrievedAt: '2026-01-01T00:00:00.000Z',
    });
  }
  enrichGameData(plan, resources);
  return plan;
}
