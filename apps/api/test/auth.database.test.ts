import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import { loadEnvironment, getConfig } from '../src/config.js';
import { createPool } from '../src/db/client.js';
import { createAuthRepository } from '../src/auth/repository.js';
import { hash, token } from '../src/auth/security.js';
import { discordUser } from './helpers/auth.js';

test(
  'Discord accounts and hashed sessions persist, rotate and expire in MySQL',
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
      const migration = await readFile(
        new URL('../database/changes/007-discord-auth.sql', import.meta.url),
        'utf8',
      );
      for (let round = 0; round < 2; round++)
        for (const statement of migration
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean))
          await pool.query(statement);
      const store = createAuthRepository(pool);
      const state = token();
      const binding = token();
      const value = { verifier: token(), returnTo: '/equipes?page=2' };
      await store.createState(hash(state), hash(binding), value);
      assert.equal(await store.consumeState(hash(state), hash(token())), null);
      const concurrent = await Promise.all([
        store.consumeState(hash(state), hash(binding)),
        store.consumeState(hash(state), hash(binding)),
      ]);
      assert.equal(concurrent.filter(Boolean).length, 1);
      assert.deepEqual(concurrent.find(Boolean), value);
      assert.equal(await store.consumeState(hash(state), hash(binding)), null);
      await store.createState(hash(state), hash(binding), value);
      await pool.execute(
        'UPDATE auth_states SET expires_at=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 SECOND)',
      );
      assert.equal(await store.consumeState(hash(state), hash(binding)), null);
      const firstToken = token();
      const first = await store.signIn(discordUser, hash(firstToken));
      assert.equal((await store.session(hash(firstToken)))?.id, first.id);
      const nextToken = token();
      const next = await store.signIn(
        { ...discordUser, displayName: 'Updated tester' },
        hash(nextToken),
        hash(firstToken),
      );
      assert.equal(next.id, first.id);
      assert.equal(next.displayName, 'Updated tester');
      assert.equal(await store.session(hash(firstToken)), null);
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT HEX(token_hash) AS hash,LENGTH(token_hash) AS length FROM auth_sessions',
      );
      assert.equal(rows.length, 1);
      assert.equal(rows[0]?.length, 32);
      assert.equal(String(rows[0]?.hash).toLowerCase(), hash(nextToken));
      const [users] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS count FROM users');
      assert.equal(users[0]?.count, 1);
      await pool.execute(
        'UPDATE auth_sessions SET expires_at=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 SECOND)',
      );
      assert.equal(await store.session(hash(nextToken)), null);
      const lastToken = token();
      await store.signIn(discordUser, hash(lastToken));
      await store.signOut(hash(lastToken));
      assert.equal(await store.session(hash(lastToken)), null);
      const cascade = token();
      await store.signIn(discordUser, hash(cascade));
      await pool.execute('DELETE FROM users WHERE id=?', [first.id]);
      assert.equal(await store.session(hash(cascade)), null);
    } finally {
      await pool.end();
      await server.query(`DROP DATABASE \`${name}\``);
      await server.end();
    }
  },
);
