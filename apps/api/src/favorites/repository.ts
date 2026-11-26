import { randomUUID } from 'node:crypto';
import { LockMode } from '@mikro-orm/core';
import type { EntityManager } from '@mikro-orm/mysql';
import type { Page } from '../../../../shared/catalogue.js';
import type {
  FavoriteEntry as Entry,
  FavoriteKind,
  FavoritesState,
} from '../../../../shared/favorites.js';
import { User } from '../db/entities/user.js';
import { FavoritePlaylist } from '../db/entities/favorite-playlist.js';
import { FavoriteEntry } from '../db/entities/favorite-entry.js';
import { FavoriteError } from './errors.js';
import type { FavoriteLookup } from './catalogue.js';

export interface FavoriteRepository {
  state(userId: number): Promise<FavoritesState>;
  create(userId: number, name: string): Promise<FavoritesState>;
  remove(userId: number, playlistId: string): Promise<FavoritesState>;
  set(
    userId: number,
    playlistId: string,
    kind: FavoriteKind,
    targetId: number,
    selected: boolean,
  ): Promise<FavoritesState>;
  entries(
    userId: number,
    playlistId: string,
    kind: FavoriteKind,
    page: number,
  ): Promise<Page<Entry>>;
}
export function createFavoriteRepository(
  manager: EntityManager,
  lookup: FavoriteLookup,
): FavoriteRepository {
  async function snapshot(em: EntityManager, userId: number): Promise<FavoritesState> {
    const playlists = await em.find(
      FavoritePlaylist,
      { user: userId },
      { orderBy: { isDefault: 'desc', createdAt: 'asc', id: 'asc' } },
    );
    const entries = playlists.length
      ? await em.find(FavoriteEntry, { playlist: { $in: playlists.map((p) => p.id) } })
      : [];
    return {
      playlists: playlists.map((p) => ({ id: p.id, name: p.name, isDefault: p.isDefault })),
      entries: entries.map((e) => ({
        playlistId: e.playlist.id,
        kind: e.kind,
        targetId: e.targetId,
      })),
    };
  }
  function transaction(userId: number, action: (em: EntityManager) => Promise<void>) {
    return manager.fork().transactional(async (em) => {
      const owner = await em.findOne(User, userId, {
        fields: ['id'],
        lockMode: LockMode.PESSIMISTIC_WRITE,
      });
      if (!owner)
        throw new FavoriteError(
          401,
          'LOGIN_REQUIRED',
          'Reconnecte-toi pour retrouver tes favoris.',
        );
      if (!(await em.findOne(FavoritePlaylist, { user: userId, isDefault: true }))) {
        await em.insert(FavoritePlaylist, {
          id: randomUUID(),
          user: userId,
          name: 'Like',
          isDefault: true,
          createdAt: new Date(),
        });
      }
      await action(em);
      return snapshot(em, userId);
    });
  }
  async function owned(em: EntityManager, userId: number, id: string) {
    const playlist = await em.findOne(FavoritePlaylist, { id, user: userId });
    if (!playlist)
      throw new FavoriteError(404, 'PLAYLIST_NOT_FOUND', 'Cette playlist est introuvable.');
    return playlist;
  }
  return {
    state: (userId) => transaction(userId, async () => {}),
    create(userId, value) {
      return transaction(userId, async (em) => {
        const name = value.trim();
        if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/u.test(name))
          throw new FavoriteError(
            400,
            'INVALID_PLAYLIST',
            'Choisis un nom de playlist entre 1 et 80 caractères.',
          );
        if (await em.findOne(FavoritePlaylist, { user: userId, name }))
          throw new FavoriteError(409, 'PLAYLIST_EXISTS', 'Une playlist porte déjà ce nom.');
        if ((await em.count(FavoritePlaylist, { user: userId })) >= 30)
          throw new FavoriteError(
            409,
            'PLAYLIST_LIMIT',
            'Tu as atteint la limite de 30 playlists.',
          );
        await em.insert(FavoritePlaylist, {
          id: randomUUID(),
          user: userId,
          name,
          isDefault: false,
          createdAt: new Date(),
        });
      });
    },
    remove(userId, id) {
      return transaction(userId, async (em) => {
        const playlist = await owned(em, userId, id);
        if (playlist.isDefault)
          throw new FavoriteError(
            400,
            'DEFAULT_PLAYLIST',
            'La playlist Like ne peut pas être supprimée.',
          );
        await em.nativeDelete(FavoritePlaylist, { id });
      });
    },
    async set(userId, id, kind, targetId, selected) {
      if (selected && !(await lookup(kind, [targetId])).length)
        throw new FavoriteError(
          404,
          'FAVORITE_NOT_FOUND',
          'Cet élément du catalogue est introuvable.',
        );
      return transaction(userId, async (em) => {
        await owned(em, userId, id);
        const key = { playlist: id, kind, targetId };
        if (!selected) {
          await em.nativeDelete(FavoriteEntry, key);
          return;
        }
        if (await em.findOne(FavoriteEntry, key)) return;
        const playlists = await em.find(FavoritePlaylist, { user: userId }, { fields: ['id'] });
        if (
          (await em.count(FavoriteEntry, { playlist: { $in: playlists.map((p) => p.id) } })) >= 5000
        )
          throw new FavoriteError(
            409,
            'FAVORITE_LIMIT',
            'Tu as atteint la limite de 5 000 favoris.',
          );
        await em.insert(FavoriteEntry, { ...key, createdAt: new Date() });
      });
    },
    async entries(userId, id, kind, page) {
      const em = manager.fork();
      await owned(em, userId, id);
      const limit = 24;
      const [rows, total] = await em.findAndCount(
        FavoriteEntry,
        { playlist: id, kind },
        { orderBy: { createdAt: 'desc', targetId: 'asc' }, limit, offset: (page - 1) * limit },
      );
      const found = new Map(
        (
          await lookup(
            kind,
            rows.map((r) => r.targetId),
          )
        ).map((e) => [e.targetId, e]),
      );
      return {
        items: rows.map(
          (r) =>
            found.get(r.targetId) ?? {
              kind,
              targetId: r.targetId,
              name: 'Élément indisponible',
              imageUrl: null,
              available: false,
            },
        ),
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    },
  };
}
