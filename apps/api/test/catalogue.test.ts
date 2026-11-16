import assert from 'node:assert/strict';
import test from 'node:test';
import type { Pool } from 'mysql2/promise';
import { importCatalogue } from '../src/catalogue/import.js';
import { element, numberOrNull, prepareCatalogue, safeUrl } from '../src/catalogue/prepare.js';
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
  assert.deepEqual(moves, [{ key: 'GodHand', level: 30, alternatePath: true, flags: { evolution: '真', NB: true, a: true } }]);
  assert.throws(() => parseMoves('{ {"GodHand", os.execute("anything")} }'));
  assert.throws(() => literalTable('Example={"unfinished', 'Example'));
});

test('catalogue preparation isolates missing identities and ambiguous parameters', () => {
  const plan = prepareCatalogue(fixtureResources(), { families: [], mappings: [], memberships: [] });
  assert.equal(plan.variants.length, 9);
  assert.equal(plan.techniques.length, 4);
  assert.equal(plan.variants[0]?.stats, null);
  assert.equal(plan.variants[1]?.stats, null);
  assert.equal(plan.variants[2]?.stats?.[0], 10);
  assert.equal(plan.records.find(r => r.kind === 'player' && r.key === '900010')?.status, 'quarantined');
  assert.equal(plan.memberships.length, 0);
  assert.equal(plan.profiles.find(p => p.technique === 'Test Totem')?.work, 'GX');
  assert.equal(plan.profiles.find(p => p.technique === 'Test Shot')?.power, 0);
});

test('a changed contract or duplicate external identity stops preparation', () => {
  const resources = fixtureResources();
  const input = resources.get('players')!;
  const players = JSON.parse(input.body);
  players[1].ID = players[0].ID;
  resources.set('players', { ...input, body: JSON.stringify(players) });
  assert.throws(() => prepareCatalogue(resources, { families: [], mappings: [], memberships: [] }), /dupliqué/);
});

test('connection cleanup preserves the original failure and discards the broken connection', async () => {
  const original = new Error('original source failure');
  let calls = 0;
  let destroyed = false;
  const connection = {
    async execute() { if (calls++ === 0) return [[{ acquired: 1 }]]; throw original; },
    async beginTransaction() {},
    async rollback() { throw new Error('closed connection'); },
    destroy() { destroyed = true; },
    release() { assert.fail('A broken connection must not return to the pool.'); },
  };
  const pool = { async getConnection() { return connection; } } as unknown as Pool;
  await assert.rejects(importCatalogue(pool, fixturePlan()), error => error === original);
  assert.equal(destroyed, true);
});
