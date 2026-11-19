import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { loadEnvironment, getConfig } from '../src/config.js';
import { createPool } from '../src/db/client.js';
import { importCatalogue } from '../src/catalogue/import.js';
import { fixturePlan, fixtureGamePlan } from './helpers/catalogue.js';
import { createCatalogueRepository } from '../src/catalogue/repository.js';

test(
  'catalogue imports are atomic, repeatable and preserve user references',
  {
    skip: process.env.RUN_DATABASE_TESTS !== '1',
  },
  async (t) => {
    loadEnvironment();
    const { databaseUrl } = getConfig();
    assert(databaseUrl);
    const url = new URL(databaseUrl);
    url.pathname = '/';
    const server = createPool(url.toString());
    const name = `hakuren_test_${randomBytes(8).toString('hex')}`;
    let created = false;
    let pool: Pool | undefined;
    try {
      await server.query(
        `CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
      created = true;
      url.pathname = `/${name}`;
      pool = createPool(url.toString());
      const [selected] = await pool.query<RowDataPacket[]>('SELECT DATABASE() AS name');
      assert.equal(selected[0]?.name, name);
      const sql = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
      for (const statement of sql
        .replace(/^--.*$/gm, '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean))
        await pool.query(statement);
      const db = pool;
      const plan = fixturePlan();
      async function rows(sql: string, values: (number | string)[] = []) {
        const [result] = await db.execute<RowDataPacket[]>(sql, values);
        return result;
      }
      async function counts() {
        const result: Record<string, number> = {};
        for (const table of [
          'source_records',
          'player_variants',
          'techniques',
          'variant_appearances',
          'variant_learnsets',
        ])
          result[table] = Number((await rows(`SELECT COUNT(*) AS count FROM ${table}`))[0]?.count);
        return result;
      }
      await importCatalogue(db, plan);
      assert.equal(
        (
          await rows(
            "SELECT COUNT(*) AS count FROM works WHERE code IN ('ARES', 'ORION') AND kind='anime'",
          )
        )[0]?.count,
        2,
      );
      const first = await counts();
      const player = (
        await rows(
          `SELECT variant_id FROM variant_external_ids e JOIN data_sources s ON s.id=e.source_id WHERE s.code='level5-codex' AND external_key='900003'`,
        )
      )[0]!.variant_id as number;
      const learnset = (await rows('SELECT id FROM variant_learnsets'))[0]!.id as number;

      await t.test(
        'catalogue reads paginate and filter appearances, preserving literal searches',
        async () => {
          const read = createCatalogueRepository(db);
          const firstPage = await read.players({ limit: 2 });
          const secondPage = await read.players({ limit: 2, page: 2 });
          assert.equal(firstPage.total, 9);
          assert.equal(firstPage.pages, 5);
          assert(
            firstPage.items.every(
              (item) => !secondPage.items.some((other) => other.id === item.id),
            ),
          );
          assert.equal(
            (await read.players({ work: 'VR' })).total,
            9,
            'Presence in VR must not depend on origin.',
          );
          assert.equal((await read.players({ q: 'Same name' })).total, 2);
          assert.equal((await read.players({ q: '%' })).total, 0);
          assert.equal((await read.players({ q: 'Test Team' })).total, 9);
          const alphabetic = await read.players({ limit: 9 });
          assert.equal(alphabetic.items[0]?.name, 'Player 2');
          assert.equal((await read.players({ q: "' OR 1=1 --" })).total, 0);
          assert.equal((await read.players({ rarity: 'hero' })).total, 1);
          assert.equal((await read.players({ position: 'GK' })).total, 0);
          const detail = await read.player(player);
          assert(detail);
          assert.equal(detail.statistics?.values.power, 10);
          assert.deepEqual(detail.recordedTeams, ['Test Team']);
          assert.deepEqual(detail.teams, ['Test Team']);
          assert(
            detail.history.every((appearance) => appearance.teams.length === 0),
            'Aggregate teams must not be assigned to an episode.',
          );
          assert.equal(detail.learnsets[0]?.alternatePath, true);
          assert.equal(detail.learnsets[0]?.rarities[0]?.code, 'hero');
          const results = await read.techniques({ q: 'Test Shot' });
          const technique = await read.technique(results.items[0]!.id);
          assert.equal(technique?.profiles[0]?.power, 0);
          assert.equal(technique?.userCount, 1);
          assert.equal((await read.techniques({ work: 'GX' })).total, 1);
          const filters = await read.filters();
          assert.equal(filters.counts.players, 9);
          assert.equal(
            filters.works.length,
            9,
            'An empty work must still be available as a filter.',
          );
          await db.execute(
            `INSERT INTO technique_stat_profiles (technique_id, context_id, profile_key)
        SELECT ?, c.id, 'historical' FROM game_contexts c JOIN works w ON w.id=c.work_id WHERE w.code='GO'`,
            [results.items[0]!.id],
          );
          const forest = await read.techniques({ q: 'Test Shot', work: 'GO', element: 'forest' });
          assert.equal(forest.total, 1);
          assert.equal(forest.items[0]?.element, 'forest');
          assert.equal(
            (await read.techniques({ q: 'Test Shot', work: 'GO', element: 'fire' })).total,
            0,
          );
          assert.equal(
            (await read.technique(results.items[0]!.id))?.profiles.find(
              (profile) => profile.work.code === 'GO',
            )?.element,
            'forest',
          );
        },
      );

      await t.test('a second identical import keeps counts and IDs stable', async () => {
        await db.execute(
          `INSERT INTO users (discord_id, display_name) VALUES ('123456789012345678', 'Fixture user')`,
        );
        await db.execute(
          `INSERT INTO user_collection (user_id, variant_id, is_owned) VALUES (1, ?, 1)`,
          [player],
        );
        await db.execute(`INSERT INTO squads (user_id, name) VALUES (1, 'Saved fixture')`);
        await db.execute(
          `INSERT INTO squad_players (squad_id, variant_id, rarity_id, slot_kind, slot_number)
        SELECT 1, ?, id, 'starter', 1 FROM rarities WHERE code='hero'`,
          [player],
        );
        await db.execute(
          `INSERT INTO squad_player_techniques (squad_player_id, variant_id, slot_number, learnset_id) VALUES (1, ?, 1, ?)`,
          [player, learnset],
        );
        await importCatalogue(db, plan);
        assert.deepEqual(await counts(), first);
        assert.equal(
          (await rows('SELECT learnset_id FROM squad_player_techniques'))[0]?.learnset_id,
          learnset,
        );
        assert.equal((await rows('SELECT COUNT(*) AS count FROM user_collection'))[0]?.count, 1);
        assert.equal(
          (await rows('SELECT COUNT(*) AS count FROM characters'))[0]?.count,
          0,
          'Identical names must not create guessed families.',
        );
      });

      await t.test('a failed import rolls back earlier writes', async () => {
        const broken = {
          ...plan,
          variants: plan.variants.map((variant, index) =>
            index
              ? variant
              : { ...variant, official: { ...variant.official, name: 'Must roll back' } },
          ),
          profiles: [...plan.profiles, { ...plan.profiles[0]!, technique: 'missing-reference' }],
        };
        await assert.rejects(importCatalogue(db, broken), /SQL absent ou invalide/);
        assert.deepEqual(await counts(), first);
        assert.equal(
          (
            await rows(`SELECT COUNT(*) AS count FROM player_variants WHERE name='Must roll back'`)
          )[0]?.count,
          0,
        );
      });

      await t.test(
        'a new source revision updates the learnset without changing a saved team reference',
        async () => {
          const revised = fixturePlan();
          revised.learnsets[0]!.record.version = 'fixture-v2';
          revised.learnsets[0]!.record.payload = { variantId: 900003, revised: true };
          await importCatalogue(db, revised);
          assert.equal((await rows('SELECT id FROM variant_learnsets'))[0]?.id, learnset);
          assert.equal(
            (await rows('SELECT learnset_id FROM squad_player_techniques'))[0]?.learnset_id,
            learnset,
          );
          assert.equal((await rows('SELECT is_current FROM variant_learnsets'))[0]?.is_current, 1);
          const retired = fixturePlan();
          retired.learnsets = [];
          await importCatalogue(db, retired);
          assert.equal((await rows('SELECT is_current FROM variant_learnsets'))[0]?.is_current, 0);
          assert.equal(
            (await rows('SELECT COUNT(*) AS count FROM squad_player_techniques'))[0]?.count,
            1,
          );
          assert.equal(
            (await createCatalogueRepository(db).player(player))?.learnsets.length,
            0,
            'Retired learnsets must not be published.',
          );
        },
      );

      await t.test(
        'rarities and historical rosters import independently and retire removed source associations',
        async () => {
          const enriched = fixturePlan();
          const base = enriched.learnsets[0]!.record;
          const availability = {
            ...base,
            source: 'vr-community',
            kind: 'player_rarities',
            key: '900004',
            payload: { id: 900004, forms: ['Hero', 'Basara'] },
          };
          const membership = {
            ...base,
            kind: 'roster_membership',
            key: '900004/IE/Test Team',
            payload: { variantId: 900004, work: 'IE', team: 'Test Team' },
          };
          enriched.records.push(availability, membership);
          enriched.rarities.push(
            { externalId: '900004', rarity: 'hero', record: availability },
            { externalId: '900004', rarity: 'basara', record: availability },
          );
          enriched.memberships.push({
            id: 900004,
            work: 'IE',
            team: 'Test Team',
            record: membership,
          });
          await importCatalogue(db, enriched);
          const read = createCatalogueRepository(db);
          const detail = (await read.players({ q: '900004' })).items[0]!;
          assert.deepEqual(
            detail.rarities.map((rarity) => rarity.code),
            ['hero', 'basara'],
          );
          assert.deepEqual(
            (await read.player(detail.id))?.history.find((entry) => entry.work.code === 'IE')
              ?.teams,
            ['Test Team'],
          );
          assert.deepEqual(
            (await read.player(detail.id))?.history.find((entry) => entry.work.code === 'VR')
              ?.teams,
            [],
          );
          await importCatalogue(db, enriched);
          assert.equal((await rows('SELECT COUNT(*) AS count FROM appearance_teams'))[0]?.count, 1);
          assert.equal((await read.players({ rarity: 'basara' })).total, 1);
          await importCatalogue(db, fixturePlan());
          assert.equal((await read.players({ rarity: 'basara' })).total, 0);
          assert.equal((await read.players({ rarity: 'hero' })).total, 1);
          assert.deepEqual(
            (await read.player(detail.id))?.history.find((entry) => entry.work.code === 'IE')
              ?.teams,
            [],
          );
        },
      );

      await t.test(
        'the French game catalogue preserves saved references and supplies flat stats, auras, equipment and tactics',
        async () => {
          const enriched = await fixtureGamePlan();
          await db.execute(
            `UPDATE techniques SET preview_url='https://example.test/demo.mp4',preview_mime_type='video/mp4' WHERE name='Test Shot'`,
          );
          enriched.techniques.find((row) => row.gameId === '221679467')!.preview =
            'https://example.test/demo.mp4';
          await db.execute(
            `INSERT INTO techniques (slug,name,category) VALUES ('obsolete-passive','Obsolete passive','passive')`,
          );
          await importCatalogue(db, enriched);
          const read = createCatalogueRepository(db);
          const result = await read.techniques({ q: '221679467' });
          assert.equal(result.items[0]?.name, 'Tir français');
          assert.equal(result.items[0]?.power, 85);
          assert.equal(result.items[0]?.tension, 80);
          assert.equal(
            (await read.techniques({ q: 'Test Shot' })).items[0]?.id,
            result.items[0]?.id,
          );
          const detail = await read.technique(result.items[0]!.id);
          assert.equal(detail?.preview?.url, 'https://example.test/demo.mp4');
          assert.deepEqual(detail?.notes, ['CD 60']);
          assert.equal(detail?.userCount, 1);
          const justicePlayers = await read.players({ gender: 'male', style: 'justice' });
          assert.equal(justicePlayers.total, 1);
          assert.equal(justicePlayers.items[0]?.playStyle, 'justice');
          assert.equal((await read.players({ gender: 'female', style: 'justice' })).total, 0);
          assert.equal((await read.players({ style: 'breach' })).total, 0);
          assert.equal(detail?.users[0]?.number, '900003');
          assert.equal(detail?.grantedBy?.[0]?.gameId, '-72');
          assert.equal((await read.techniques({ category: 'passive' })).total, 0);
          assert.equal(
            (await rows("SELECT COUNT(*) AS count FROM techniques WHERE category='passive'"))[0]
              ?.count,
            0,
          );
          assert.equal(
            (await rows('SELECT learnset_id FROM squad_player_techniques'))[0]?.learnset_id,
            learnset,
          );
          const equipment = await read.items!('equipment', { slot: 'boots' });
          assert.equal(equipment.total, 1);
          assert.equal(equipment.items[0]?.stats.power, 5);
          const tactic = await read.items!('tactics', {});
          assert.equal(tactic.total, 1);
          assert.equal(tactic.items[0]?.tension, 2.5);
          assert.equal(await read.item!('equipment', tactic.items[0]!.id), null);
          assert.equal((await read.filters()).counts.equipment, 1);
          assert.equal((await read.items!('equipment', { q: '%' })).total, 0);
          await importCatalogue(db, enriched);
          assert.equal(
            (await read.techniques({ q: '221679467' })).items[0]?.id,
            result.items[0]?.id,
          );
          assert.equal((await read.items!('tactics', {})).total, 1);
          assert.equal((await read.techniques({ q: 'Tir français', category: 'shoot' })).total, 1);
          assert.equal((await read.items!('tactics', { q: 'Défense' })).total, 1);
          assert.equal((await read.items!('equipment', { q: 'Équipement absent' })).total, 0);
          await importCatalogue(db, await fixtureGamePlan(false, 3, true));
          const playerProfiles = await read.player(player);
          assert.equal(playerProfiles?.description, 'Une description\nfrançaise.');
          assert.equal(playerProfiles?.statProfiles.length, 6);
          assert.equal(
            playerProfiles?.statProfiles.find(
              (profile) => profile.rarity === 'basara' && profile.level === 99,
            )?.values.power,
            210,
          );
          assert(playerProfiles?.learnsets.some((move) => move.technique.tension === 80));
          await importCatalogue(db, await fixtureGamePlan(false, 5));
          const neutral = await read.techniques({ element: 'void' });
          assert.equal(neutral.total, 1);
          assert.equal(neutral.items[0]?.id, result.items[0]?.id);
          assert.equal(
            (await read.technique(neutral.items[0]!.id))?.preview?.url,
            'https://example.test/demo.mp4',
          );
          assert.equal(
            (await rows('SELECT learnset_id FROM squad_player_techniques'))[0]?.learnset_id,
            learnset,
          );
        },
      );

      await t.test(
        'player type filters include hybrid roles and summaries prefer approved teams from the origin work',
        async () => {
          const read = createCatalogueRepository(db);
          const selected = (await read.players({ limit: 4 })).items;
          const roles = ['Manager', 'Player Manager', 'Coordinator', 'Player Coordinator'];
          for (const [index, entry] of selected.entries())
            await db.execute('UPDATE player_variants SET role=? WHERE id=?', [
              roles[index],
              entry.id,
            ]);
          assert.equal((await read.players({ role: 'manager' })).total, 2);
          assert.equal((await read.players({ role: 'coordinator' })).total, 2);
          assert.equal((await read.players({ eligibility: 'coach' })).total, 2);
          assert.equal((await read.players({ eligibility: 'manager' })).total, 2);
          assert.equal((await read.players({ eligibility: 'player', role: 'manager' })).total, 1);
          assert.equal(
            (await read.players({ eligibility: 'coach', role: 'coordinator' })).total,
            0,
          );
          for (const entry of selected)
            await db.execute("UPDATE player_variants SET role='Player' WHERE id=?", [entry.id]);
          await db.execute(
            "INSERT INTO source_records (source_id,entity_kind,external_key,source_version,retrieved_at,payload,review_status) SELECT source_id,'roster_membership','fixture-origin-team','fixture',NOW(3),'{}','verified' FROM source_records LIMIT 1",
          );
          const source = (
            await rows("SELECT id FROM source_records WHERE external_key='fixture-origin-team'")
          )[0]!.id;
          await db.execute(
            "INSERT INTO historical_teams (slug,name) VALUES ('fixture-origin','Origin team'),('fixture-other-work','Other work team')",
          );
          const originTeam = (
            await rows("SELECT id FROM historical_teams WHERE slug='fixture-origin'")
          )[0]!.id;
          const otherTeam = (
            await rows("SELECT id FROM historical_teams WHERE slug='fixture-other-work'")
          )[0]!.id;
          await db.execute(
            "INSERT INTO appearance_teams (appearance_id,historical_team_id,source_record_id) SELECT a.id,?,? FROM variant_appearances a JOIN works w ON w.id=a.work_id WHERE a.variant_id=? AND w.code='IE'",
            [originTeam, source, player],
          );
          await db.execute(
            "INSERT INTO appearance_teams (appearance_id,historical_team_id) SELECT a.id,? FROM variant_appearances a JOIN works w ON w.id=a.work_id WHERE a.variant_id=? AND w.code='VR'",
            [otherTeam, player],
          );
          assert.deepEqual((await read.player(player))?.teams, ['Origin team']);
          assert.equal((await read.players({ q: 'Origin team' })).total, 1);
          assert.equal((await read.players({ q: 'Other work team' })).total, 1);
          assert.deepEqual((await read.players({ q: 'Player 2' })).items[0]?.teams, [
            'Origin team',
          ]);
          await db.execute("UPDATE source_records SET review_status='quarantined' WHERE id=?", [
            source,
          ]);
          assert.deepEqual((await read.player(player))?.teams, ['Test Team']);
          assert.equal((await read.players({ q: 'Origin team' })).total, 0);
          await db.execute('DELETE FROM appearance_teams WHERE historical_team_id IN (?,?)', [
            originTeam,
            otherTeam,
          ]);
          await db.execute('DELETE FROM historical_teams WHERE id IN (?,?)', [
            originTeam,
            otherTeam,
          ]);
          await db.execute('DELETE FROM source_records WHERE id=?', [source]);
        },
      );

      await t.test('manual quarantine is preserved and prevents publication', async () => {
        const input = plan.variants[0]!.record;
        await db.execute(
          `UPDATE source_records SET review_status='quarantined' WHERE entity_kind='player' AND external_key=? AND source_version=?`,
          [input.key, input.version],
        );
        await assert.rejects(importCatalogue(db, plan), /Source non validée/);
        assert.equal(
          (
            await rows(
              `SELECT review_status FROM source_records WHERE entity_kind='player' AND external_key=? AND source_version=?`,
              [input.key, input.version],
            )
          )[0]?.review_status,
          'quarantined',
        );
        const read = createCatalogueRepository(db);
        const hidden = (
          await rows(
            "SELECT variant_id FROM variant_external_ids e JOIN data_sources s ON s.id=e.source_id WHERE s.code='level5-codex' AND external_key=?",
            [input.key],
          )
        )[0]!.variant_id;
        assert.equal(await read.player(hidden), null);
        assert.equal((await read.players({})).total, 8);
        assert.equal((await read.filters()).counts.players, 8);
      });
    } finally {
      await pool?.end();
      try {
        if (created) await server.query(`DROP DATABASE \`${name}\``);
      } finally {
        await server.end();
      }
    }
  },
);
