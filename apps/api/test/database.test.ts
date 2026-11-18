import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { getConfig, loadEnvironment } from '../src/config.js';
import { createPool } from '../src/db/client.js';
test(
  'the relational model preserves catalogue and user data integrity',
  {
    skip: process.env.RUN_DATABASE_TESTS !== '1',
  },
  async (t) => {
    loadEnvironment();
    const { databaseUrl } = getConfig();
    assert(databaseUrl, 'Configurer DATABASE_URL pour tester le schéma.');
    const url = new URL(databaseUrl);
    url.pathname = '/';
    const server = createPool(url.toString());
    const name = `hakuren_test_${randomBytes(8).toString('hex')}`;
    let created = false;
    let db: Pool | undefined;
    try {
      await server.query(
        `CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
      created = true;
      url.pathname = `/${name}`;
      db = createPool(url.toString());
      const [selected] = await db.query<RowDataPacket[]>('SELECT DATABASE() AS name');
      assert.equal(selected[0]?.name, name, 'Le schéma doit cibler uniquement la base temporaire.');
      const sql = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
      for (const statement of sql
        .replace(/^--.*$/gm, '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)) {
        await db.query(statement);
      }
      const database = db;
      async function rows(sql: string, parameters: unknown[] = []) {
        const [result] = await database.execute<RowDataPacket[]>(sql, parameters);
        return result;
      }
      async function reject(sql: string, parameters: unknown[], ...expectedErrnos: number[]) {
        await assert.rejects(database.execute(sql, parameters), (error: unknown) => {
          return (
            typeof error === 'object' &&
            error !== null &&
            'errno' in error &&
            expectedErrnos.includes(Number(error.errno))
          );
        });
      }
      const duplicate = 1062;
      const foreignKey = 1452;
      const checks = [3819, 4025]; // MySQL / MariaDB.

      await database.query(
        `INSERT INTO data_sources (id, code, name) VALUES (1, 'fixture', 'Test source')`,
      );
      await database.execute(
        `INSERT INTO source_records
      (id, source_id, entity_kind, external_key, source_version, retrieved_at, payload, review_status)
      VALUES (1, 1, 'player', 'external-a', 'v1', CURRENT_TIMESTAMP(3), ?, 'verified'),
             (2, 1, 'player', 'external-a', 'v2', CURRENT_TIMESTAMP(3), ?, 'quarantined')`,
        [JSON.stringify({ sample: true }), JSON.stringify({ ambiguous: true })],
      );
      await database.query(`INSERT INTO works (id, code, name, kind) VALUES
      (1, 'test-game-a', 'Game A', 'game'), (2, 'test-game-b', 'Game B', 'game')`);
      await database.query(
        `INSERT INTO characters (id, slug, name) VALUES (1, 'character-a', 'Character A')`,
      );
      await database.query(`INSERT INTO player_variants (id, character_id, name, variant_label, origin_work_id) VALUES
      (1, 1, 'Character A', 'Base', 1), (2, 1, 'Character A', 'Alternate', 1)`);
      await database.query(
        `INSERT INTO variant_external_ids (source_id, external_key, variant_id) VALUES (1, 'external-a', 1)`,
      );
      await database.query(`INSERT INTO game_contexts (id, work_id, mode_code, game_version) VALUES
      (1, 1, 'standard', 'release'), (2, 2, 'standard', 'release')`);
      await database.query(`INSERT INTO rarities (id, code, name) VALUES
      (1, 'fixture-common', 'Common fixture'), (2, 'fixture-hero', 'Hero fixture')`);
      await database.query(
        `INSERT INTO variant_rarities (variant_id, rarity_id) VALUES (1, 1), (2, 1)`,
      );
      await database.query(
        `INSERT INTO techniques (id, slug, name, category) VALUES (1, 'test-shot', 'Test shot', 'shoot')`,
      );
      await database.query(`INSERT INTO users (id, discord_id, display_name) VALUES
      (1, '123456789012345678', 'User A'), (2, '223456789012345678', 'User B')`);

      await t.test(
        'variants share an identity while history stays specific to each work',
        async () => {
          await database.query(
            `INSERT INTO variant_appearances (id, variant_id, work_id) VALUES (1, 1, 1), (2, 1, 2)`,
          );
          await database.query(`INSERT INTO historical_teams (id, slug, name) VALUES
        (1, 'team-a', 'Team A'), (2, 'team-b', 'Team B')`);
          await database.query(
            `INSERT INTO appearance_teams (appearance_id, historical_team_id) VALUES (1, 1), (2, 2)`,
          );
          const teams = await rows(`SELECT a.work_id, ht.name FROM appearance_teams m
        JOIN variant_appearances a ON a.id = m.appearance_id
        JOIN historical_teams ht ON ht.id = m.historical_team_id
        WHERE a.variant_id = 1 ORDER BY a.work_id`);
          assert.deepEqual(
            teams.map((r) => [r.work_id, r.name]),
            [
              [1, 'Team A'],
              [2, 'Team B'],
            ],
          );
          await reject(
            `INSERT INTO variant_appearances (variant_id, work_id) VALUES (1, 1)`,
            [],
            duplicate,
          );
          await reject(
            `INSERT INTO variant_external_ids (source_id, external_key, variant_id) VALUES (1, 'external-a', 2)`,
            [],
            duplicate,
          );
          const record = (await rows(`SELECT review_status FROM source_records WHERE id = 2`))[0];
          assert.equal(record?.review_status, 'quarantined');
        },
      );

      await t.test('statistics keep their context and unknown values', async () => {
        await database.query(`INSERT INTO player_stat_profiles
        (variant_id, context_id, profile_key, level, power, agility) VALUES
        (1, 1, 'base-50', 50, NULL, 0), (1, 2, 'base-50', 50, 123, NULL)`);
        const stats = await rows(
          `SELECT context_id, power, agility FROM player_stat_profiles WHERE variant_id = 1 ORDER BY context_id`,
        );
        assert.deepEqual(
          stats.map((r) => [r.context_id, r.power, r.agility]),
          [
            [1, null, 0],
            [2, 123, null],
          ],
        );
        await reject(
          `INSERT INTO player_stat_profiles (variant_id, context_id, profile_key, level) VALUES (1, 1, 'invalid', 0)`,
          [],
          ...checks,
        );
      });

      await t.test(
        'learnsets retain source restrictions independently of rarity and mode',
        async () => {
          await database.execute(
            `INSERT INTO variant_learnsets
        (id, variant_id, technique_id, context_id, source_record_id, source_entry_key,
         source_section, unlock_level, alternate_path, basara_only, rarity_scope, source_flags)
        VALUES (1, 1, 1, 1, 1, 'set:0', 'VR', 30, 1, 0, 'restricted', ?)`,
            [JSON.stringify({ NB: true, a: true })],
          );
          await database.query(
            `INSERT INTO learnset_rarities (learnset_id, rarity_id) VALUES (1, 1)`,
          );
          await database.query(`INSERT INTO variant_learnsets
        (id, variant_id, technique_id, context_id, source_record_id, source_entry_key)
        VALUES (2, 2, 1, 1, 1, 'set:1')`);
          const unknown = (
            await rows(
              `SELECT alternate_path, basara_only, rarity_scope FROM variant_learnsets WHERE id = 2`,
            )
          )[0];
          assert.equal(unknown?.alternate_path, null);
          assert.equal(unknown?.basara_only, null);
          assert.equal(unknown?.rarity_scope, 'unknown');
          const stored = (await rows(`SELECT source_flags FROM variant_learnsets WHERE id = 1`))[0]
            ?.source_flags;
          assert.deepEqual(typeof stored === 'string' ? JSON.parse(stored) : stored, {
            NB: true,
            a: true,
          });
        },
      );

      await t.test('collection and wishlist are independent and unique to each user', async () => {
        await database.query(`INSERT INTO user_collection (user_id, variant_id, is_owned, is_wishlisted)
        VALUES (1, 1, 1, 1), (2, 1, 0, 1)`);
        await reject(
          `INSERT INTO user_collection (user_id, variant_id, is_owned) VALUES (1, 1, 1)`,
          [],
          duplicate,
        );
        await reject(
          `INSERT INTO user_collection (user_id, variant_id) VALUES (1, 2)`,
          [],
          ...checks,
        );
        await reject(
          `INSERT INTO user_collection (user_id, variant_id, is_owned) VALUES (999, 1, 1)`,
          [],
          foreignKey,
        );
        assert.equal(
          (await rows(`SELECT discord_id FROM users WHERE id = 1`))[0]?.discord_id,
          '123456789012345678',
        );
      });

      await t.test(
        'squads reject occupied slots, repeated players and unverified rarities',
        async () => {
          await database.query(
            `INSERT INTO formations (id, code, name) VALUES (1, 'test-formation', 'Test formation')`,
          );
          await database.query(
            `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) VALUES (1, 1, 'GK', 50, 90)`,
          );
          await reject(
            `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) VALUES (1, 2, 'DF', 101, 50)`,
            [],
            ...checks,
          );
          await database.query(`INSERT INTO squads (id, user_id, name, formation_id, context_id) VALUES
        (1, 1, 'Draft A', 1, 1), (2, 2, 'Draft B', 1, 1)`);
          await database.query(`INSERT INTO squad_players (id, squad_id, variant_id, rarity_id, slot_kind, slot_number)
        VALUES (1, 1, 1, 1, 'starter', 1), (2, 2, 1, 1, 'starter', 1)`);
          await reject(
            `INSERT INTO squad_players (squad_id, variant_id, rarity_id, slot_kind, slot_number)
        VALUES (1, 2, 1, 'starter', 1)`,
            [],
            duplicate,
          );
          await reject(
            `INSERT INTO squad_players (squad_id, variant_id, rarity_id, slot_kind, slot_number)
        VALUES (1, 1, 1, 'substitute', 1)`,
            [],
            duplicate,
          );
          await reject(
            `INSERT INTO squad_players (squad_id, variant_id, rarity_id, slot_kind, slot_number)
        VALUES (1, 2, 1, 'starter', 12)`,
            [],
            ...checks,
          );
          await reject(
            `INSERT INTO squad_players (squad_id, variant_id, rarity_id, slot_kind, slot_number)
        VALUES (1, 2, 2, 'substitute', 1)`,
            [],
            foreignKey,
          );
          await database.query(`INSERT INTO squad_player_techniques (squad_player_id, variant_id, slot_number, learnset_id)
        VALUES (1, 1, 1, 1)`);
          await reject(
            `INSERT INTO squad_player_techniques (squad_player_id, variant_id, slot_number, learnset_id)
        VALUES (1, 1, 2, 2)`,
            [],
            foreignKey,
          );
        },
      );

      await t.test(
        'deleting an account removes its saved data and preserves other users and catalogue',
        async () => {
          await database.query(
            `INSERT INTO squad_staff (squad_id, variant_id, role, slot_number) VALUES (1, 2, 'coach', 1)`,
          );
          await database.query(`DELETE FROM users WHERE id = 1`);
          for (const table of [
            'squads',
            'squad_players',
            'squad_player_techniques',
            'squad_staff',
          ]) {
            const found = await rows(`SELECT COUNT(*) AS count FROM ${table}`);
            assert.equal(
              Number(found[0]?.count),
              table === 'squads' || table === 'squad_players' ? 1 : 0,
            );
          }
          assert.equal(
            Number((await rows(`SELECT COUNT(*) AS count FROM user_collection`))[0]?.count),
            1,
          );
          assert.equal(
            Number((await rows(`SELECT COUNT(*) AS count FROM player_variants`))[0]?.count),
            2,
          );
          assert.equal(
            Number((await rows(`SELECT COUNT(*) AS count FROM source_records`))[0]?.count),
            2,
          );
        },
      );
    } finally {
      await db?.end();
      try {
        if (created) await server.query(`DROP DATABASE \`${name}\``);
      } finally {
        await server.end();
      }
    }
  },
);
