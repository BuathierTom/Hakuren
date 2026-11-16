import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { loadEnvironment, getConfig } from '../src/config.js';
import { createPool } from '../src/db/client.js';
import { importCatalogue } from '../src/catalogue/import.js';
import { fixturePlan } from './helpers/catalogue.js';

test('catalogue imports are atomic, repeatable and preserve user references', {
  skip: process.env.RUN_DATABASE_TESTS !== '1',
}, async t => {
  loadEnvironment();
  const { databaseUrl } = getConfig();
  assert(databaseUrl);
  const url = new URL(databaseUrl);
  url.pathname = '/';
  const server = createPool(url.toString());
  const name = `kizunadex_test_${randomBytes(8).toString('hex')}`;
  let created = false;
  let pool: Pool | undefined;
  try {
    await server.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    created = true;
    url.pathname = `/${name}`;
    pool = createPool(url.toString());
    const [selected] = await pool.query<RowDataPacket[]>('SELECT DATABASE() AS name');
    assert.equal(selected[0]?.name, name);
    const sql = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
    for (const statement of sql.replace(/^--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean)) await pool.query(statement);
    const db = pool;
    const plan = fixturePlan();
    async function rows(sql: string, values: (number | string)[] = []) {
      const [result] = await db.execute<RowDataPacket[]>(sql, values);
      return result;
    }
    async function counts() {
      const result: Record<string, number> = {};
      for (const table of ['source_records', 'player_variants', 'techniques', 'variant_appearances', 'variant_learnsets']) result[table] = Number((await rows(`SELECT COUNT(*) AS count FROM ${table}`))[0]?.count);
      return result;
    }
    await importCatalogue(db, plan);
    assert.equal((await rows("SELECT COUNT(*) AS count FROM works WHERE code IN ('ARES', 'ORION') AND kind='anime'"))[0]?.count, 2);
    const first = await counts();
    const player = (await rows(`SELECT variant_id FROM variant_external_ids e JOIN data_sources s ON s.id=e.source_id WHERE s.code='level5-codex' AND external_key='900003'`))[0]!.variant_id as number;
    const learnset = (await rows('SELECT id FROM variant_learnsets'))[0]!.id as number;

    await t.test('a second identical import keeps counts and IDs stable', async () => {
      await db.execute(`INSERT INTO users (discord_id, display_name) VALUES ('123456789012345678', 'Fixture user')`);
      await db.execute(`INSERT INTO user_collection (user_id, variant_id, is_owned) VALUES (1, ?, 1)`, [player]);
      await db.execute(`INSERT INTO squads (user_id, name) VALUES (1, 'Saved fixture')`);
      await db.execute(`INSERT INTO squad_players (squad_id, variant_id, rarity_id, slot_kind, slot_number)
        SELECT 1, ?, id, 'starter', 1 FROM rarities WHERE code='hero'`, [player]);
      await db.execute(`INSERT INTO squad_player_techniques (squad_player_id, variant_id, slot_number, learnset_id) VALUES (1, ?, 1, ?)`, [player, learnset]);
      await importCatalogue(db, plan);
      assert.deepEqual(await counts(), first);
      assert.equal((await rows('SELECT learnset_id FROM squad_player_techniques'))[0]?.learnset_id, learnset);
      assert.equal((await rows('SELECT COUNT(*) AS count FROM user_collection'))[0]?.count, 1);
      assert.equal((await rows('SELECT COUNT(*) AS count FROM characters'))[0]?.count, 0, 'Identical names must not create guessed families.');
    });

    await t.test('a failed import rolls back earlier writes', async () => {
      const broken = { ...plan, variants: plan.variants.map((variant, index) => index ? variant : { ...variant, official: { ...variant.official, name: 'Must roll back' } }), profiles: [...plan.profiles, { ...plan.profiles[0]!, technique: 'missing-reference' }] };
      await assert.rejects(importCatalogue(db, broken), /SQL absent ou invalide/);
      assert.deepEqual(await counts(), first);
      assert.equal((await rows(`SELECT COUNT(*) AS count FROM player_variants WHERE name='Must roll back'`))[0]?.count, 0);
    });

    await t.test('a new source revision updates the learnset without changing a saved team reference', async () => {
      const revised = fixturePlan();
      revised.learnsets[0]!.record.version = 'fixture-v2';
      revised.learnsets[0]!.record.payload = { variantId: 900003, revised: true };
      await importCatalogue(db, revised);
      assert.equal((await rows('SELECT id FROM variant_learnsets'))[0]?.id, learnset);
      assert.equal((await rows('SELECT learnset_id FROM squad_player_techniques'))[0]?.learnset_id, learnset);
      assert.equal((await rows('SELECT is_current FROM variant_learnsets'))[0]?.is_current, 1);
      const retired = fixturePlan();
      retired.learnsets = [];
      await importCatalogue(db, retired);
      assert.equal((await rows('SELECT is_current FROM variant_learnsets'))[0]?.is_current, 0);
      assert.equal((await rows('SELECT COUNT(*) AS count FROM squad_player_techniques'))[0]?.count, 1);
    });

    await t.test('manual quarantine is preserved and prevents publication', async () => {
      const input = plan.variants[0]!.record;
      await db.execute(`UPDATE source_records SET review_status='quarantined' WHERE entity_kind='player' AND external_key=? AND source_version=?`, [input.key, input.version]);
      await assert.rejects(importCatalogue(db, plan), /Source non validée/);
      assert.equal((await rows(`SELECT review_status FROM source_records WHERE entity_kind='player' AND external_key=? AND source_version=?`, [input.key, input.version]))[0]?.review_status, 'quarantined');
    });
  } finally {
    await pool?.end();
    try { if (created) await server.query(`DROP DATABASE \`${name}\``); }
    finally { await server.end(); }
  }
});
