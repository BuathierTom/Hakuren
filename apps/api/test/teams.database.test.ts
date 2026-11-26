import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import { loadEnvironment, getConfig } from '../src/config.js';
import { createPool } from '../src/db/client.js';
import { createOrm } from '../src/db/orm.js';
import { migrate } from '../src/db/migrate.js';
import { createTeamRepository } from '../src/teams/repository.js';
import { TeamError } from '../src/teams/errors.js';
import { exampleTeam } from './helpers/teams.js';
test(
  'MySQL retains complete account teams, isolates owners and atomically rejects stale writes and quota races',
  { skip: process.env.RUN_DATABASE_TESTS !== '1' },
  async () => {
    loadEnvironment();
    const config = getConfig();
    assert(config.databaseUrl);
    const url = new URL(config.databaseUrl);
    url.pathname = '/';
    const server = createPool(url.href);
    const name = 'hakuren_test_' + randomBytes(8).toString('hex');
    await server.query(
      `CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    url.pathname = '/' + name;
    const pool = createPool(url.href);
    let orm: Awaited<ReturnType<typeof createOrm>> | undefined;
    try {
      const schema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
      for (const sql of schema
        .replace(/^--.*$/gm, '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean))
        await pool.query(sql);
      const migration = await readFile(
        new URL('../database/changes/008-account-teams.sql', import.meta.url),
        'utf8',
      );
      for (let i = 0; i < 2; i++)
        for (const sql of migration
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean))
          await pool.query(sql);
      await pool.query(
        "INSERT INTO users (id,discord_id,display_name) VALUES (1,'111111111111111111','One'),(2,'222222222222222222','Two')",
      );
      orm = await createOrm(url.href);
      await migrate(orm);
      const repository = createTeamRepository(orm.em);
      const team = {
        ...exampleTeam(),
        playStyle: 'counter' as const,
        tactics: [101, null, 103],
        playerNotes: { '1': 'Consigne joueur\nÉquipe uniquement ⚽', '99': 'Ancien joueur' },
      };
      const first = await repository.save(1, team, null);
      assert.deepEqual(first.team, team);
      assert.equal(first.revision, 1);
      assert(Number.isFinite(Date.parse(first.updatedAt)));
      assert.deepEqual(await repository.list(2), []);
      const writes = await Promise.allSettled([
        repository.save(1, { ...team, name: 'First edit' }, 1),
        repository.save(1, { ...team, name: 'Second edit' }, 1),
      ]);
      assert.equal(writes.filter((result) => result.status === 'fulfilled').length, 1);
      const rejected = writes.find((result) => result.status === 'rejected');
      assert(
        rejected?.status === 'rejected' &&
          rejected.reason instanceof TeamError &&
          rejected.reason.code === 'TEAM_CONFLICT',
      );
      const loaded = await createTeamRepository(orm.em).list(1);
      assert.equal(loaded[0]?.revision, 2);
      assert.deepEqual(loaded[0]?.team.slots, team.slots);
      await assert.rejects(
        repository.remove(2, team.id, 2),
        (error) => error instanceof TeamError && error.status === 404,
      );
      await repository.save(2, { ...team, name: 'Owner two' }, null);
      assert.equal((await repository.list(1))[0]?.team.name, loaded[0]?.team.name);
      const draft = await repository.save(1, { ...team, name: 'Draft' }, null, true);
      assert.equal(await repository.draft(2), null);
      assert.deepEqual((await repository.draft(1))?.team, draft.team);
      await assert.rejects(
        repository.save(1, team, null, true),
        (error) => error instanceof TeamError && error.status === 409,
      );
      await repository.save(1, { ...team, slots: {} }, draft.revision, true);
      assert.deepEqual((await repository.draft(1))?.team.slots, {});
      await assert.rejects(
        repository.save(1, { ...team, id: 'bad-formation', formation: 'missing' }, null),
        (error) => error instanceof TeamError && error.code === 'INVALID_FORMATION',
      );
      for (let index = 0; index < 48; index++)
        await pool.execute(
          'INSERT INTO user_teams (user_id,team_id,payload,revision,updated_at) VALUES (1,?,?,1,UTC_TIMESTAMP(3))',
          [`quota-${index}`, JSON.stringify({ ...team, id: `quota-${index}` })],
        );
      const quotas = await Promise.allSettled([
        repository.save(1, { ...team, id: 'quota-a' }, null),
        repository.save(1, { ...team, id: 'quota-b' }, null),
      ]);
      assert.equal(quotas.filter((result) => result.status === 'fulfilled').length, 1);
      assert.equal((await repository.list(1)).length, 50);
      const denied = quotas.find((result) => result.status === 'rejected');
      assert(
        denied?.status === 'rejected' &&
          denied.reason instanceof TeamError &&
          denied.reason.code === 'TEAM_LIMIT',
      );
      await repository.save(1, { ...team, name: 'Update at quota' }, 2);
      await repository.remove(1, team.id, 3);
      assert.equal((await repository.list(1)).length, 49);
      await pool.execute('DELETE FROM users WHERE id=1');
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT (SELECT COUNT(*) FROM user_teams WHERE user_id=1) AS teams,(SELECT COUNT(*) FROM user_team_drafts WHERE user_id=1) AS drafts',
      );
      assert.equal(rows[0]?.teams, 0);
      assert.equal(rows[0]?.drafts, 0);
      assert.equal((await repository.list(2)).length, 1);
    } finally {
      await orm?.close(true);
      await pool.end();
      await server.query(`DROP DATABASE \`${name}\``);
      await server.end();
    }
  },
);
