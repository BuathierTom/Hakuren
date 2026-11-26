import { Migration20261126135356_catalogue_translations } from '../src/db/migrations/migration-20261126135356-catalogue-translations.js';
import { Migration20261126120000_favorites } from '../src/db/migrations/migration-20261126120000-favorites.js';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Migration } from '@mikro-orm/migrations';
import { MikroORM } from '@mikro-orm/mysql';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { getConfig, loadEnvironment } from '../src/config.js';
import { createPool } from '../src/db/client.js';
import { createOrm, ormOptions } from '../src/db/orm.js';
import { migrate } from '../src/db/migrate.js';
import { Migration20261124104546_initial } from '../src/db/migrations/migration-20261124104546-initial.js';
import { createDatabase } from '../src/db/client.js';
import { exampleTeam } from './helpers/teams.js';

async function withDatabase(action: (url: string, pool: Pool) => Promise<void>) {
  loadEnvironment();
  const { databaseUrl } = getConfig();
  assert(databaseUrl);
  const url = new URL(databaseUrl);
  url.pathname = '/';
  const server = createPool(url.href);
  const name = `hakuren_migrations_${randomBytes(8).toString('hex')}`;
  await server.query(
    `CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  url.pathname = '/' + name;
  const pool = createPool(url.href);
  try {
    await action(url.href, pool);
  } finally {
    await pool.end();
    await server.query(`DROP DATABASE \`${name}\``);
    await server.end();
  }
}

class AddFixtureFlag extends Migration {
  override up(): void {
    this.addSql('ALTER TABLE users ADD COLUMN fixture_flag INT UNSIGNED NOT NULL DEFAULT 0');
  }
}

class FailedFixtureMigration extends Migration {
  override up(): void {
    this.addSql('SELECT * FROM missing_migration_fixture');
  }
}

test(
  'MikroORM migrations initialize empty and existing databases and apply pending changes once',
  {
    skip: process.env.RUN_DATABASE_TESTS !== '1',
  },
  async (t) => {
    await t.test(
      'concurrent first deployments initialize the schema and formations exactly once',
      async () => {
        await withDatabase(async (url, pool) => {
          const first = await createOrm(url);
          const second = await createOrm(url);
          try {
            const expected = (await first.migrator.getPending()).length;
            assert(expected > 0);
            const applied = await Promise.all([migrate(first), migrate(second)]);
            assert.equal(applied.flat().length, expected);
            assert.equal((await first.migrator.getExecuted()).length, expected);
            assert.deepEqual(await migrate(first), []);
            const [keys] = await pool.query<RowDataPacket[]>(
              "SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND CONSTRAINT_NAME='PRIMARY' ORDER BY TABLE_NAME,ORDINAL_POSITION",
            );
            const [columns] = await pool.query<RowDataPacket[]>(
              'SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()',
            );
            for (const table of first.schema.getTargetSchema().getTables()) {
              assert.deepEqual(
                table.getIndexes().find((index) => index.primary)?.columnNames,
                keys.filter((key) => key.TABLE_NAME === table.name).map((key) => key.COLUMN_NAME),
                table.name,
              );
              assert.deepEqual(
                table
                  .getColumns()
                  .map((column) => column.name)
                  .sort(),
                columns
                  .filter((column) => column.TABLE_NAME === table.name)
                  .map((column) => column.COLUMN_NAME)
                  .sort(),
                table.name,
              );
            }
            assert.equal(await first.migrator.checkSchema(), false);
            const database = await createDatabase(url);
            try {
              await database.check();
              const formations = await database.formations.list();
              assert.equal(formations.length, 8);
              assert(formations.every((formation) => formation.positions.length === 11));
              assert.equal((await database.catalogue.filters()).counts.players, 0);
            } finally {
              await database.close();
            }
          } finally {
            await first.close(true);
            await second.close(true);
          }
        });
      },
    );

    await t.test(
      'adopting an existing database preserves catalogue, accounts, sessions and saved teams',
      async () => {
        await withDatabase(async (url, pool) => {
          const schema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
          for (const statement of schema
            .split(';')
            .map((sql) => sql.trim())
            .filter(Boolean))
            await pool.query(statement);
          const team = exampleTeam();
          await pool.query(
            "INSERT INTO users (id,discord_id,display_name) VALUES (7,'123456789012345678','Existing user')",
          );
          await pool.query(
            "INSERT INTO data_sources (id,code,name) VALUES (1,'level5-codex','Existing source')",
          );
          await pool.query(`INSERT INTO source_records (id,source_id,entity_kind,external_key,source_version,retrieved_at,payload,review_status)
            VALUES (1,1,'player','42','fixture',UTC_TIMESTAMP(3),'${JSON.stringify({ gameCharacterId: 'c01000010' })}','verified')`);
          await pool.query(
            "INSERT INTO player_variants (id,name,source_record_id) VALUES (42,'Existing player',1)",
          );
          await pool.query(
            "INSERT INTO techniques (id,slug,name,category,game_id) VALUES (51,'existing-shot','Existing technique','shoot','221679467')",
          );
          await pool.query(
            "INSERT INTO formations (id,code,name) VALUES (77,'4-3-3-triangle','Existing formation')",
          );
          await pool.execute(
            'INSERT INTO user_teams (user_id,team_id,payload,revision,updated_at) VALUES (7,?,?,9,UTC_TIMESTAMP(3))',
            [team.id, JSON.stringify(team)],
          );
          await pool.execute(
            'INSERT INTO user_team_drafts (user_id,payload,revision,updated_at) VALUES (7,?,4,UTC_TIMESTAMP(3))',
            [JSON.stringify(team)],
          );
          const sessionHash = 'ab'.repeat(32);
          await pool.execute(
            'INSERT INTO auth_sessions (token_hash,user_id,expires_at) VALUES (UNHEX(?),7,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 1 HOUR))',
            [sessionHash],
          );
          const snapshot = async () =>
            (
              await pool.query<RowDataPacket[]>(
                'SELECT user_id,team_id,SHA2(payload,256) AS checksum,revision,updated_at FROM user_teams',
              )
            )[0];
          const before = await snapshot();
          const orm = await createOrm(url);
          try {
            const expected = (await orm.migrator.getPending()).length;
            assert.equal((await migrate(orm)).length, expected);
            assert.deepEqual(await migrate(orm), []);
            assert.deepEqual(await snapshot(), before);
            const [players] = await pool.query<RowDataPacket[]>(
              'SELECT id,name FROM player_variants',
            );
            assert.deepEqual(
              players.map((row) => [row.id, row.name]),
              [[42, 'Existing player']],
            );
            const database = await createDatabase(url);
            try {
              assert.equal((await database.auth.session(sessionHash))?.id, 7);
              assert.deepEqual((await database.teams.list(7))[0]?.team, team);
              assert.equal((await database.teams.draft(7))?.revision, 4);
              assert.equal((await database.catalogue.technique(51))?.name, 'Existing technique');
              assert.equal(
                (await database.catalogue.technique(51))?.translations?.en?.name,
                "Heaven's Time",
              );
              assert.equal(
                (await database.catalogue.players({ q: 'Mark Evans' })).items[0]?.translations?.en
                  ?.name,
                'Mark Evans',
              );
              assert.equal(
                (await database.formations.list()).find(
                  (formation) => formation.code === team.formation,
                )?.id,
                77,
              );
            } finally {
              await database.close();
            }
          } finally {
            await orm.close(true);
          }
        });
      },
    );

    await t.test('new migrations execute once and a failed migration remains pending', async () => {
      await withDatabase(async (url, pool) => {
        const initial = await createOrm(url);
        let baseline: string;
        let baselineCount: number;
        let favoritesMigration: string;
        let translationsMigration: string;
        try {
          await migrate(initial);
          const executed = await initial.migrator.getExecuted();
          baseline = executed[0]!.name;
          baselineCount = executed.length;
          favoritesMigration = executed.find((migration) =>
            migration.name.endsWith('-favorites'),
          )!.name;
          translationsMigration = executed.find((migration) =>
            migration.name.endsWith('-catalogue-translations'),
          )!.name;
        } finally {
          await initial.close(true);
        }
        await pool.query(
          "INSERT INTO users (discord_id,display_name) VALUES ('123456789012345678','Keep me')",
        );
        const options = ormOptions(url);
        const migrations = [
          { name: baseline, class: Migration20261124104546_initial },
          { name: favoritesMigration, class: Migration20261126120000_favorites },
          { name: translationsMigration, class: Migration20261126135356_catalogue_translations },
          { name: 'migration-99999999999990-fixture', class: AddFixtureFlag },
        ];
        const orm = await MikroORM.init({
          ...options,
          migrations: { ...options.migrations, migrationsList: migrations },
        });
        try {
          assert.equal((await migrate(orm)).length, 1);
          await pool.query('UPDATE users SET fixture_flag=7');
          assert.deepEqual(await migrate(orm), []);
          const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT display_name,fixture_flag FROM users',
          );
          assert.equal(rows[0]?.display_name, 'Keep me');
          assert.equal(rows[0]?.fixture_flag, 7);
        } finally {
          await orm.close(true);
        }
        const failing = await MikroORM.init({
          ...options,
          migrations: {
            ...options.migrations,
            migrationsList: [
              ...migrations,
              { name: 'migration-99999999999999-failure', class: FailedFixtureMigration },
            ],
          },
        });
        try {
          await assert.rejects(migrate(failing));
          assert.equal((await failing.migrator.getExecuted()).length, baselineCount + 1);
          assert.equal((await failing.migrator.getPending()).length, 1);
        } finally {
          await failing.close(true);
        }
      });
    });
  },
);
