import { EntitySchema, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import type { FavoriteKind } from '../../../../../shared/favorites.js';
import { FavoritePlaylist } from './favorite-playlist.js';

export class FavoriteEntry {
  [PrimaryKeyProp]?: ['playlist', 'kind', 'targetId'];
  playlist!: Ref<FavoritePlaylist>;
  kind!: FavoriteKind;
  targetId!: number;
  createdAt!: Date;
}
export const FavoriteEntrySchema = new EntitySchema({
  class: FavoriteEntry,
  tableName: 'favorite_entries',
  indexes: [
    {
      name: 'idx_favorite_entries_order',
      properties: ['playlist', 'kind', 'createdAt', 'targetId'],
    },
  ],
  properties: {
    playlist: {
      primary: true,
      kind: 'm:1',
      entity: () => FavoritePlaylist,
      ref: true,
      deleteRule: 'cascade',
      updateRule: 'restrict',
      foreignKeyName: 'fk_favorite_entry_playlist',
      index: false,
    },
    kind: { primary: true, type: 'string', length: 16, collation: 'ascii_bin' },
    targetId: { primary: true, type: 'integer', unsigned: true },
    createdAt: { type: 'datetime', length: 3 },
  },
});
