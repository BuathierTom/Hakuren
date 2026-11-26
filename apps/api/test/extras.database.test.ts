import { createOrm } from '../src/db/orm.js';
import { migrate } from '../src/db/migrate.js';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { loadEnvironment, getConfig } from '../src/config.js';
import { createPool } from '../src/db/client.js';
import { importCatalogue } from '../src/catalogue/import.js';
import { createCatalogueRepository } from '../src/catalogue/repository.js';
import { prepareExtras } from '../src/catalogue/extras.js';
import { fixtureGamePlan } from './helpers/catalogue.js';
import { extrasResources } from './helpers/extras.js';

test(
  'passives and team rosters import repeatably and keep uncertain generations separate',
  { skip: process.env.RUN_DATABASE_TESTS !== '1' },
  async () => {
    loadEnvironment();
    const config = getConfig();
    assert(config.databaseUrl);
    const url = new URL(config.databaseUrl);
    url.pathname = '/';
    const server = createPool(url.toString());
    const name = `hakuren_test_${randomBytes(8).toString('hex')}`;
    await server.query(
      `CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    url.pathname = `/${name}`;
    const pool = createPool(url.toString());
    try {
      const schema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
      for (const statement of schema
        .replace(/^--.*$/gm, '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean))
        await pool.query(statement);
      const orm = await createOrm(url.toString());
      try {
        await migrate(orm);
      } finally {
        await orm.close(true);
      }
      const plan = await fixtureGamePlan();
      plan.extras = prepareExtras(extrasResources());
      const record = {
        source: 'inazuma-wiki',
        kind: 'team_membership',
        key: '900004/IE/Test Team',
        version: 'extras-fixture',
        url: 'https://example.test/team',
        retrievedAt: '2026-11-20T00:00:00.000Z',
        payload: {},
        status: 'verified' as const,
        note: null,
      };
      plan.records.push(record);
      plan.memberships.push({ id: 900004, work: 'IE', team: 'Test Team', record });
      await importCatalogue(pool, plan);
      const repo = createCatalogueRepository(pool);
      const first = await repo.passives!({ source: 'player', style: 'breach', limit: 1 });
      assert.equal(first.total, 2);
      assert.equal(first.pages, 2);
      assert.equal(first.items[0]?.value, 1.2);
      assert.equal((await repo.passives!({ q: 'for allies' })).total, 1);
      assert.equal(first.items[0]?.translations?.en?.description, 'ATK +1.2 % for allies');
      assert.equal((await repo.passives!({ q: '%' })).total, 4);
      assert.equal((await repo.passives!({ q: "' OR 1=1" })).total, 0);
      assert.equal((await repo.loadouts!()).equipment.length, 1);
      assert.equal((await repo.loadouts!()).passives.length, 5);
      assert.equal((await repo.filters()).counts.passives, 5);
      await pool.execute(
        "INSERT INTO historical_teams (slug,name) VALUES ('fixture-unaffiliated','Unaffiliated'),('fixture-sub-character','Sub Character')",
      );
      assert.equal((await repo.teams!({})).total, 1);
      assert.equal((await repo.filters()).counts.teams, 1);
      const teams = await repo.teams!({ q: 'Test Team' });
      assert.equal(teams.total, 1);
      const team = await repo.team!(teams.items[0]!.id);
      assert(team);
      assert.equal(team.playerCount, 9);
      assert(team.logoUrl?.endsWith('/logo.png'));
      assert.equal(team.rosters.find((r) => r.work?.code === 'IE')?.players.length, 1);
      assert.equal(team.rosters.find((r) => r.work === null)?.players.length, 8);
      assert.equal((await repo.teams!({ work: 'IE' })).total, 1);
      assert.equal((await repo.teams!({ work: 'VR' })).total, 0);
      assert.equal((await repo.teams!({ q: '%' })).total, 0);
      await pool.execute(
        "INSERT INTO historical_teams (slug,name) VALUES ('fixture-second-team','Other fixture')",
      );
      await pool.execute(`INSERT INTO appearance_teams (appearance_id,historical_team_id,source_record_id)
        SELECT a.id,h.id,(SELECT source_record_id FROM appearance_teams WHERE source_record_id IS NOT NULL LIMIT 1)
        FROM variant_appearances a JOIN player_variants v ON v.id=a.variant_id
        JOIN works w ON w.id=a.work_id JOIN historical_teams h ON h.slug='fixture-second-team'
        WHERE v.name='Player 2' AND w.code='VR'`);
      const pageOne = await repo.teams!({ limit: 1 });
      const pageTwo = await repo.teams!({ limit: 1, page: 2 });
      assert.equal(pageOne.total, 2);
      assert.equal(pageOne.pages, 2);
      assert.equal(pageOne.items[0]?.name, 'Other fixture');
      assert.equal(pageOne.items[0]?.playerCount, 1);
      assert.equal(pageTwo.items[0]?.name, 'Test Team');
      assert.equal(pageTwo.items[0]?.playerCount, 9);
      assert.deepEqual(
        pageTwo.items[0]?.works.map((work) => work.code),
        ['IE'],
      );
      assert.equal((await repo.teams!({ work: 'VR' })).items[0]?.name, 'Other fixture');
      await pool.execute(
        `UPDATE source_records SET review_status='pending' WHERE id IN (SELECT source_record_id FROM appearance_teams WHERE source_record_id IS NOT NULL)`,
      );
      assert.equal((await repo.teams!({ work: 'VR' })).total, 0);
      const unknown = await repo.team!(team.id);
      assert.equal(unknown?.rosters.length, 1);
      assert.equal(unknown?.rosters[0]?.work, null);
      assert.equal(unknown?.rosters[0]?.players.length, 9);
      assert.equal((await repo.team!(pageOne.items[0]!.id))?.playerCount, 0);
      await pool.execute(
        `UPDATE source_records SET review_status='verified' WHERE id IN (SELECT source_record_id FROM appearance_teams WHERE source_record_id IS NOT NULL)`,
      );
      await importCatalogue(pool, plan);
      assert.equal((await repo.passives!({ limit: 1 })).total, 5);
      assert.equal((await repo.passive!(first.items[0]!.id))?.stringId, first.items[0]!.stringId);
      assert.equal(await repo.team!(4294967295), null);
    } finally {
      await pool.end();
      await server.query(`DROP DATABASE \`${name}\``);
      await server.end();
    }
  },
);
