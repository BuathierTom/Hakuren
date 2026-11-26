import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import { getConfig, loadEnvironment } from '../src/config.js';
import { createPool } from '../src/db/client.js';
import { createOrm } from '../src/db/orm.js';
import { migrate } from '../src/db/migrate.js';
import { createFavoriteRepository } from '../src/favorites/repository.js';
import { favoriteCatalogue } from '../src/favorites/catalogue.js';
import { FavoriteError } from '../src/favorites/errors.js';
import { createAuthRepository } from '../src/auth/repository.js';
import { hash, token } from '../src/auth/security.js';
import { discordUser } from './helpers/auth.js';
import { exampleTeam } from './helpers/teams.js';
import { createTeamRepository } from '../src/teams/repository.js';

test(
  'MySQL favorites persist across sessions, isolate owners, paginate and cascade on account deletion',
  { skip: process.env.RUN_DATABASE_TESTS !== '1' },
  async () => {
    loadEnvironment();
    const { databaseUrl } = getConfig();
    assert(databaseUrl);
    const url = new URL(databaseUrl);
    url.pathname = '/';
    const server = createPool(url.href);
    const name = 'hakuren_favorites_' + randomBytes(8).toString('hex');
    await server.query(
      'CREATE DATABASE `' + name + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    );
    url.pathname = '/' + name;
    const pool = createPool(url.href);
    const orm = await createOrm(url.href);
    try {
      await migrate(orm);
      const auth = createAuthRepository(orm.em);
      const firstToken = token();
      const secondToken = token();
      const one = await auth.signIn(discordUser, hash(firstToken));
      const two = await auth.signIn(
        { ...discordUser, discordId: '888888888888888888' },
        hash(secondToken),
      );
      await pool.query(
        'INSERT INTO player_variants (id,name) VALUES ' +
          Array.from({ length: 26 }, (_, i) => `(${i + 1},'Player ${i + 1}')`).join(','),
      );
      await pool.query(
        "INSERT INTO techniques (id,slug,name,category) VALUES (1,'favorite-shot','Tir favori','shoot'),(2,'not-a-technique','Hidden passive','passive')",
      );
      await pool.query(
        "INSERT INTO catalogue_items (id,section,game_id,string_id,name) VALUES (1,'equipment','1','boots','Chaussures'),(2,'tactics','2','tactic','Tactique')",
      );
      await pool.query("INSERT INTO historical_teams (id,slug,name) VALUES (1,'zeus','Zeus')");
      const repository = createFavoriteRepository(orm.em, favoriteCatalogue(pool));
      const defaults = await Promise.all([repository.state(one.id), repository.state(one.id)]);
      assert.equal(defaults[0]!.playlists.length, 1);
      assert.deepEqual(defaults[0], defaults[1]);
      const like = defaults[0]!.playlists[0]!;
      const created = await repository.create(one.id, '  Favoris de tournoi  ');
      const custom = created.playlists.find((p) => !p.isDefault)!;
      assert.equal(custom.name, 'Favoris de tournoi');
      const other = (await repository.state(two.id)).playlists[0]!;
      for (const [kind, targetId] of [
        ['players', 1],
        ['techniques', 1],
        ['equipment', 1],
        ['tactics', 2],
        ['teams', 1],
      ] as const)
        await repository.set(one.id, like.id, kind, targetId, true);
      await Promise.all([
        repository.set(one.id, custom.id, 'players', 1, true),
        repository.set(one.id, custom.id, 'players', 1, true),
      ]);
      assert.equal((await repository.state(one.id)).entries.length, 6);
      assert.equal((await repository.state(two.id)).entries.length, 0);
      await repository.set(two.id, other.id, 'players', 1, true);
      for (const action of [
        () => repository.entries(two.id, custom.id, 'players', 1),
        () => repository.set(two.id, custom.id, 'players', 1, false),
        () => repository.remove(two.id, custom.id),
      ])
        await assert.rejects(
          action,
          (error) => error instanceof FavoriteError && error.status === 404,
        );
      for (const value of ['', '   ', 'x'.repeat(81), 'bad\nname'])
        await assert.rejects(
          repository.create(one.id, value),
          (error) => error instanceof FavoriteError && error.status === 400,
        );
      await assert.rejects(
        repository.create(one.id, 'favoris de tournoi'),
        (error) => error instanceof FavoriteError && error.code === 'PLAYLIST_EXISTS',
      );
      await assert.rejects(
        repository.remove(one.id, like.id),
        (error) => error instanceof FavoriteError && error.code === 'DEFAULT_PLAYLIST',
      );
      for (const [kind, targetId] of [
        ['players', 9999],
        ['techniques', 2],
        ['equipment', 2],
        ['tactics', 1],
      ] as const)
        await assert.rejects(
          repository.set(one.id, custom.id, kind, targetId, true),
          (error) => error instanceof FavoriteError && error.code === 'FAVORITE_NOT_FOUND',
        );
      for (let id = 2; id <= 26; id++) await repository.set(one.id, custom.id, 'players', id, true);
      const first = await repository.entries(one.id, custom.id, 'players', 1);
      const next = await repository.entries(one.id, custom.id, 'players', 2);
      assert.equal(first.total, 26);
      assert.equal(first.items.length, 24);
      assert.equal(next.items.length, 2);
      assert.equal(new Set([...first.items, ...next.items].map((e) => e.targetId)).size, 26);
      await pool.query('DELETE FROM player_variants WHERE id=26');
      const all = [
        ...(await repository.entries(one.id, custom.id, 'players', 1)).items,
        ...(await repository.entries(one.id, custom.id, 'players', 2)).items,
      ];
      assert.equal(all.find((e) => e.targetId === 26)?.available, false);
      await repository.set(one.id, custom.id, 'players', 26, false);
      await repository.set(one.id, custom.id, 'players', 26, false);
      const reload = createFavoriteRepository(orm.em, favoriteCatalogue(pool));
      assert.equal((await reload.state(one.id)).entries.length, 30);
      await repository.remove(one.id, custom.id);
      assert.equal((await repository.state(one.id)).entries.length, 5);
      const teams = createTeamRepository(orm.em);
      await teams.save(one.id, exampleTeam(), null);
      await teams.save(one.id, exampleTeam(), null, true);
      const anotherToken = token();
      await auth.signIn(discordUser, hash(anotherToken));
      await auth.deleteAccount(one.id);
      assert.equal(await auth.session(hash(firstToken)), null);
      assert.equal(await auth.session(hash(anotherToken)), null);
      assert(await auth.session(hash(secondToken)));
      assert.deepEqual(await teams.list(one.id), []);
      assert.equal(await teams.draft(one.id), null);
      const [counts] = await pool.query<RowDataPacket[]>(
        'SELECT (SELECT COUNT(*) FROM favorite_playlists) AS playlists,(SELECT COUNT(*) FROM favorite_entries) AS entries',
      );
      assert.equal(counts[0]?.playlists, 1);
      assert.equal(counts[0]?.entries, 1);
      assert.equal((await reload.state(two.id)).entries.length, 1);
      await assert.rejects(
        repository.state(one.id),
        (error) => error instanceof FavoriteError && error.status === 401,
      );
      assert((await favoriteCatalogue(pool)('players', [1])).length);
    } finally {
      await orm.close(true);
      await pool.end();
      await server.query('DROP DATABASE `' + name + '`');
      await server.end();
    }
  },
);
