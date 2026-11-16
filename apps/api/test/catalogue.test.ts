import assert from 'node:assert/strict';
import test from 'node:test';
import type { Pool } from 'mysql2/promise';
import { importCatalogue } from '../src/catalogue/import.js';
import { contextualElement } from '../src/catalogue/repository.js';
import {
  browserVideoUrl,
  element,
  numberOrNull,
  prepareCatalogue,
  safeUrl,
} from '../src/catalogue/prepare.js';
import { prepareMemberships, rosterTemplates } from '../src/catalogue/memberships.js';
import { digest, type Resource } from '../src/catalogue/sources.js';
import { parseOfficial } from '../src/catalogue/official.js';
import { literalTable, parseMoves } from '../src/catalogue/wiki.js';
import { fixturePlan, fixtureResources, officialHtml } from './helpers/catalogue.js';

test('catalogue normalization preserves unknowns and selects the requested game element', () => {
  assert.equal(numberOrNull(null), null);
  assert.equal(numberOrNull(0), 0);
  assert.throws(() => numberOrNull('90'));
  assert.throws(() => numberOrNull(-1));
  assert.equal(element({ GO: 'Forest', VR: 'Fire' }), 'fire');
  assert.equal(element({ GO: 'Wind' }), null);
  assert.equal(element('Void'), 'void');
  assert.throws(() => element('constructor'));
  assert.throws(() => safeUrl('javascript:alert(1)'));
  assert.equal(
    contextualElement({ Element: { GO: 'Forest', VR: 'Fire' } }, 'GO', 'fire'),
    'forest',
  );
  assert.equal(contextualElement({ Element: { VR: 'Fire' } }, 'GX', 'fire'), null);
  assert.equal(contextualElement(null, 'VR', 'fire'), 'fire');
  assert.equal(contextualElement(null, 'GO', 'fire'), null);
});

test('official appearances are independent from origin and unexpected table layouts fail', () => {
  const resources = fixtureResources();
  const rows = parseOfficial(resources.get('official-1')!.body);
  assert.deepEqual(rows[0]?.appearances, ['IE', 'VR']);
  assert.equal(rows[0]?.origin, 'Inazuma Eleven');
  assert.throws(() => parseOfficial(resources.get('official-1')!.body.replace('○', '?')));
  assert.throws(() => parseOfficial(officialHtml([])));
});

test('literal wiki reading preserves flags and evolutions without executing expressions', () => {
  const source = 'Example={\n moveset={\n VR={\n {"GodHand",30,"真",NB=true,a=true}\n }\n }\n}';
  const entry = literalTable(source, 'Example')!;
  const moves = parseMoves(literalTable(literalTable(entry, 'moveset')!, 'VR')!);
  assert.deepEqual(moves, [
    {
      key: 'GodHand',
      level: 30,
      alternatePath: true,
      flags: { evolution: '真', NB: true, a: true },
    },
  ]);
  assert.throws(() => parseMoves('{ {"GodHand", os.execute("anything")} }'));
  assert.throws(() => literalTable('Example={"unfinished', 'Example'));
});

test('catalogue preparation isolates missing identities and ambiguous parameters', () => {
  const plan = prepareCatalogue(fixtureResources(), {
    families: [],
    mappings: [],
    memberships: [],
  });
  assert.equal(plan.variants.length, 9);
  assert.equal(plan.techniques.length, 4);
  assert.equal(plan.variants[0]?.stats, null);
  assert.equal(plan.variants[1]?.stats, null);
  assert.equal(plan.variants[2]?.stats?.[0], 10);
  assert.equal(
    plan.records.find((r) => r.kind === 'player' && r.key === '900010')?.status,
    'quarantined',
  );
  assert.equal(plan.memberships.length, 0);
  assert.equal(plan.profiles.find((p) => p.technique === 'Test Totem')?.work, 'GX');
  assert.equal(plan.profiles.find((p) => p.technique === 'Test Shot')?.power, 0);
});

test('a changed contract or duplicate external identity stops preparation', () => {
  const resources = fixtureResources();
  const input = resources.get('players')!;
  const players = JSON.parse(input.body);
  players[1].ID = players[0].ID;
  resources.set('players', { ...input, body: JSON.stringify(players) });
  assert.throws(
    () => prepareCatalogue(resources, { families: [], mappings: [], memberships: [] }),
    /dupliqué/,
  );
});

test('official portraits do not depend on ambiguous statistics', () => {
  const resources = fixtureResources();
  const html = resources.get('official-1')!;
  resources.set('official-1', {
    ...html,
    body: html.body.replace(
      '<td>Same name</td>',
      '<td><picture><source srcset="https://example.test/mark.webp"><img src="https://example.test/mark.png"></picture>Same name</td>',
    ),
  });
  const plan = prepareCatalogue(resources, { families: [], mappings: [], memberships: [] });
  assert.equal(plan.variants[0]?.stats, null);
  assert.equal(plan.variants[0]?.portrait, 'https://example.test/mark.webp');
});

test('browser previews use the official MP4 endpoint without rewriting arbitrary media hosts', () => {
  assert.equal(
    browserVideoUrl('https://dxi4wb638ujep.cloudfront.net/1/k/b/-/b-1asv4xwdk.wmv'),
    'https://dxi4wb638ujep.cloudfront.net/1/k/b/-/b-1asv4xwdk.mp4',
  );
  assert.equal(browserVideoUrl('https://example.test/clip.wmv'), null);
  assert.equal(browserVideoUrl('https://example.test/clip.mp4'), 'https://example.test/clip.mp4');
  assert.equal(browserVideoUrl(null), null);
  assert.throws(() => browserVideoUrl('javascript:alert(1)'));
});

test('rarity availability is independent from learnset publication and does not come from normal high-level moves', () => {
  const resources = fixtureResources();
  const input = resources.get('players')!;
  const players = JSON.parse(input.body);
  players[2].Techniques = [{ Form: 'Hero' }, { Form: 'Basara' }, { Form: 'Hero' }];
  players[3].Techniques = [{ Form: 'Normal', Level: 43 }];
  players[4].Techniques = [{ Form: 'Hero' }];
  players[4].Element = 'Fire';
  resources.set('players', { ...input, body: JSON.stringify(players) });
  const plan = prepareCatalogue(resources, { families: [], mappings: [], memberships: [] });
  assert.deepEqual(
    plan.rarities.map((entry) => [entry.externalId, entry.rarity]),
    [
      ['900003', 'hero'],
      ['900003', 'basara'],
    ],
  );
  assert.equal(plan.learnsets.length, 0);
  assert(plan.rarities.every((entry) => entry.record.kind === 'player_rarities'));
});

test('historical teams require a literal roster, an exact alias, a known appearance and a matching origin', () => {
  const resources = fixtureResources();
  const variants = prepareCatalogue(resources, {
    families: [],
    mappings: [],
    memberships: [],
  }).variants;
  function add(id: string, url: string, value: unknown) {
    const body = JSON.stringify(value);
    const resource: Resource = {
      id,
      url,
      body,
      sha256: digest(body),
      retrievedAt: '2026-01-01T00:00:00.000Z',
    };
    resources.set(id, resource);
  }
  add('wiki-names-1', 'https://example.test/?titles=Player+2', {
    query: {
      redirects: [{ from: 'Player 2', to: 'Canonical Player' }],
      pages: [{ title: 'Canonical Player' }],
    },
  });
  add('wiki-playerdata-ie', 'https://example.test/module', {
    query: {
      pages: [
        {
          title: 'Module:PlayerData/IE',
          revisions: [
            {
              revid: 1,
              slots: {
                main: { content: 'local PLAYERS={\n\tExample={\n page="Canonical Player"\n}\n}' },
              },
            },
          ],
        },
      ],
    },
  });
  const content =
    '{{Team\n|name=Test Team\n|debut_game={{Media|games|IE}}\n}}\n{{#invoke:MemberTable|main\n|game=VR\n|no1=1{{tt|*|Note}}|p1=Example\n|p2=Other\n}}\n{{Tab|Inazuma Eleven GO|{{#invoke:MemberTable|main|game=GO|p1=Example}}}}';
  assert.equal(rosterTemplates(content)[0]?.p1, 'Example');
  const tabs = rosterTemplates(
    '{{Tab|Inazuma Eleven Eiyuutachi no Victory Road|<tabber>\n|-|Chronicle Mode=\n{{#invoke:MemberTable|main|game=VR|p1=Example}}\n</tabber>}}',
  );
  assert.equal(tabs[0]?.context, 'VR');
  add('wiki-teams-1', 'https://example.test/?titles=Test+Team', {
    query: {
      pages: [{ title: 'Test Team', revisions: [{ revid: 10, slots: { main: { content } } }] }],
    },
  });
  const plan = prepareMemberships(resources, variants);
  assert.deepEqual(
    plan.memberships.map((entry) => [entry.id, entry.work, entry.team]),
    [[900003, 'IE', 'Test Team']],
  );
  const anotherForm = [...variants, { ...variants[2]!, externalId: '900099' }];
  assert.equal(prepareMemberships(resources, anotherForm).memberships.length, 2);
  const wrongOrigin = variants.map((variant) => ({
    ...variant,
    official: { ...variant.official, origin: 'Inazuma Eleven GO: Light / Shadow' },
  }));
  assert.equal(prepareMemberships(resources, wrongOrigin).memberships.length, 0);
  resources.delete('wiki-names-1');
  assert.equal(prepareMemberships(resources, variants).memberships.length, 0);
});

test('connection cleanup preserves the original failure and discards the broken connection', async () => {
  const original = new Error('original source failure');
  let calls = 0;
  let destroyed = false;
  const connection = {
    async execute() {
      if (calls++ === 0) return [[{ acquired: 1 }]];
      throw original;
    },
    async beginTransaction() {},
    async rollback() {
      throw new Error('closed connection');
    },
    destroy() {
      destroyed = true;
    },
    release() {
      assert.fail('A broken connection must not return to the pool.');
    },
  };
  const pool = {
    async getConnection() {
      return connection;
    },
  } as unknown as Pool;
  await assert.rejects(importCatalogue(pool, fixturePlan()), (error) => error === original);
  assert.equal(destroyed, true);
});
