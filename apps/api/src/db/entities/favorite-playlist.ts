import { EntitySchema, type Ref } from '@mikro-orm/core';
import { User } from './user.js';

export class FavoritePlaylist {
  id!: string;
  user!: Ref<User>;
  name!: string;
  isDefault!: boolean;
  createdAt!: Date;
}
export const FavoritePlaylistSchema = new EntitySchema({
  class: FavoritePlaylist,
  tableName: 'favorite_playlists',
  uniques: [{ name: 'uq_favorite_playlist_name', properties: ['user', 'name'] }],
  properties: {
    id: { primary: true, type: 'string', length: 36, collation: 'ascii_bin' },
    user: {
      kind: 'm:1',
      entity: () => User,
      ref: true,
      deleteRule: 'cascade',
      updateRule: 'restrict',
      foreignKeyName: 'fk_favorite_playlist_user',
      index: false,
    },
    name: { type: 'string', length: 80 },
    isDefault: { type: 'boolean' },
    createdAt: { type: 'datetime', length: 3 },
  },
});
