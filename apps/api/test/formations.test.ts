import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { buildApp } from '../src/app.js';
import { createFormationRepository } from '../src/formations/repository.js';
import { randomBytes } from 'node:crypto';
import { getConfig, loadEnvironment } from '../src/config.js';
import { createPool } from '../src/db/client.js';
import type { Pool } from 'mysql2/promise';
test('formations endpoint returns database positions and refuses unsupported filters', async () => {
  const formation = {
    id: 1,
    code: '4-3-3-triangle',
    name: '4-3-3 Triangle',
    positions: [{ slot: 1, position: 'GK' as const, x: 50, y: 0 }],
  };
  const app = buildApp({ formations: { list: async () => [formation] } });
  try {
    const response = await app.inject('/api/formations');
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { items: [formation] });
    assert.equal((await app.inject('/api/formations?unknown=1')).statusCode, 400);
  } finally {
    await app.close();
  }
});
test('formations endpoint reports a missing or failed database without exposing SQL', async () => {
  for (const formations of [
    undefined,
    {
      list: async () => {
        throw new Error('private mysql credentials');
      },
    },
  ]) {
    const app = buildApp({ formations });
    try {
      const response = await app.inject('/api/formations');
      assert.equal(response.statusCode, 503);
      assert(!response.body.includes('credentials'));
    } finally {
      await app.close();
    }
  }
});
test('formation repository converts SQL decimals and discards incomplete formations', async () => {
  const rows = Array.from({ length: 11 }, (_, i) => ({
    id: 1,
    code: 'test',
    name: 'Test',
    slot_number: i + 1,
    position: i === 0 ? 'GK' : 'DF',
    x: '50.00',
    y: '13.20',
  }));
  rows.push({ ...rows[0]!, id: 2 });
  const pool = { execute: async () => [rows] } as unknown as Pool;
  const result = await createFormationRepository(pool).list();
  assert.equal(result.length, 1);
  assert.equal(result[0]?.positions.length, 11);
  assert.equal(result[0]?.positions[0]?.y, 13.2);
});
test('formation seed contains exactly eight complete formations with stable coordinates', async () => {
  const sql = await readFile(
    new URL('../database/changes/005-formations.sql', import.meta.url),
    'utf8',
  );
  assert.equal((sql.match(/INSERT INTO formations /g) ?? []).length, 8);
  assert.equal((sql.match(/INSERT INTO formation_positions /g) ?? []).length, 88);
  assert(sql.includes('ON DUPLICATE KEY UPDATE'));
  assert(sql.startsWith('START TRANSACTION;'));
  assert(sql.trim().endsWith('COMMIT;'));
});

test(
  'formation seed is repeatable in MySQL and keeps existing squad references',
  { skip: process.env.RUN_DATABASE_TESTS !== '1' },
  async () => {
    loadEnvironment();
    const { databaseUrl } = getConfig();
    assert(databaseUrl);
    const url = new URL(databaseUrl);
    url.pathname = '/';
    const server = createPool(url.toString());
    const name = `hakuren_formations_${randomBytes(8).toString('hex')}`;
    let database: Pool | undefined;
    let created = false;
    try {
      await server.query(
        `CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
      created = true;
      url.pathname = `/${name}`;
      database = createPool(url.toString());
      const schema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
      for (const statement of schema
        .replace(/^--.*$/gm, '')
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean))
        await database.query(statement);
      const seed = await readFile(
        new URL('../database/changes/005-formations.sql', import.meta.url),
        'utf8',
      );
      const connection = await database.getConnection();
      try {
        for (const statement of seed
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean))
          await connection.query(statement);
        const before = await createFormationRepository(database).list();
        assert.equal(before.length, 8);
        assert(before.every((formation) => formation.positions.length === 11));
        await connection.query(
          "INSERT INTO users (discord_id, display_name) VALUES ('123456789012345678', 'Formation test')",
        );
        await connection.execute(
          "INSERT INTO squads (user_id,name,formation_id) VALUES (1,'Test team',?)",
          [before[0]!.id],
        );
        for (const statement of seed
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean))
          await connection.query(statement);
        assert.deepEqual(await createFormationRepository(database).list(), before);
        const [squads] = await connection.query('SELECT formation_id FROM squads');
        assert.equal((squads as { formation_id: number }[])[0]?.formation_id, before[0]!.id);
      } finally {
        connection.release();
      }
    } finally {
      await database?.end();
      if (created) await server.query(`DROP DATABASE \`${name}\``);
      await server.end();
    }
  },
);
