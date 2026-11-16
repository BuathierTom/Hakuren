import type { Resource } from '../../src/catalogue/sources.js';
import { digest } from '../../src/catalogue/sources.js';
import { WORKS } from '../../src/catalogue/official.js';
import { prepareCatalogue, STATS } from '../../src/catalogue/prepare.js';

const icons = ['ie1', 'ie2', 'ie3', 'go1', 'go2', 'go3', 'ars', 'ori', 'vic'];
export function officialHtml(players: Record<string, unknown>[]) {
  const header = icons.map(icon => `<th class="appearedWorks"><img src="icn_${icon}.png"></th>`).join('');
  return `<table><tr>${header}</tr>${players.map(player => {
    const cells = [`<input data-chara-id="asset-${player.ID}">`, player.ID, player.Name, player.Nickname, player.Game, player.Gender, player.Element, player.Position, player.Role, player['Age group'], player['School year'], 'Test Team', ''];
    return `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr><tr>${icons.map((_, index) => `<td>${index === 0 || index === 8 ? '○' : '×'}</td>`).join('')}</tr>`;
  }).join('')}</table>`;
}

export function fixtureResources() {
  const players = Array.from({ length: 10 }, (_, index) => ({
    ID: 900_001 + index, Name: index < 2 ? 'Same name' : `Player ${index}`,
    Nickname: 'Alias', Game: WORKS[0][1], Gender: 'Male', Element: 'Wind', Position: 'MF',
    Role: 'Player', 'Age group': 'Adult', 'School year': '', Teams: ['Test Team'],
    Image: null, Obtain: [], Techniques: [], ...Object.fromEntries(STATS.map(stat => [stat, 10])),
  }));
  const resources = new Map<string, Resource>();
  function add(id: string, value: unknown, html = false) {
    const body = html ? value as string : JSON.stringify(value);
    resources.set(id, { id, url: `https://example.test/${id}`, retrievedAt: '2026-01-01T00:00:00.000Z', sha256: digest(body), body });
  }
  add('players', players);
  add('official-1', officialHtml(players.slice(0, 9)), true);
  add('techniques', [{ Name: 'Test Shot', 'Wiki name': 'Test Shot', Type: 'Shoot', Element: { GO: 'Forest', VR: 'Fire' }, Power: 0, Cost: null }]);
  add('keshins', [{ Name: 'Test Spirit', Element: 'Wind', KP: { GO: [10, 20] }, Attack: { GO: [5, 6] } }]);
  add('mixmax', [{ Aura: 'Test Aura', Element: 'Mountain' }]);
  add('totems', [{ Name: 'Test Totem', Element: 'Void', 'Galaxy stats': { Power: 30, Cost: 10, Damage: -5 } }]);
  add('wiki-WazaData', { query: { pages: [{ revisions: [{ slots: { main: { content: 'local WAZAS={}' } } }] }] } });
  return resources;
}

export function fixturePlan() {
  const plan = prepareCatalogue(fixtureResources(), { families: [], mappings: [], memberships: [] });
  const record = {
    source: 'inazuma-wiki', kind: 'learnset', key: 'Fixture/Example/VRH', version: 'fixture-v1', url: 'https://example.test/moves',
    retrievedAt: '2026-01-01T00:00:00.000Z', payload: { variantId: 900_003 }, status: 'verified' as const, note: null,
  };
  plan.records.push(record);
  plan.learnsets.push({ externalId: '900003', technique: 'Test Shot', work: 'VR', mode: 'standard', version: 'unspecified', section: 'VRH',
    entryKey: 'VRH:TestShot:stable', level: 30, alternatePath: true, basaraOnly: false, rarityScope: 'restricted', rarities: ['hero'], flags: { NB: true, a: true }, record });
  return plan;
}
