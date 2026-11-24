import { EntitySchema, type Opt, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import { PlayerVariant } from './player-variant.js';
import { User } from './user.js';

export class UserCollection {
  [PrimaryKeyProp]?: ['user', 'variant'];
  user!: Ref<User>;
  variant!: Ref<PlayerVariant>;
  isOwned: boolean & Opt = false;
  isWishlisted: boolean & Opt = false;
  updatedAt!: Date & Opt;
}

export const UserCollectionSchema = new EntitySchema({
  class: UserCollection,
  tableName: 'user_collection',
  checks: [
    { name: 'ck_collection_owned', expression: '`is_owned` in (0,1)' },
    {
      name: 'ck_collection_tracked',
      expression: '`is_owned` = 1 or `is_wishlisted` = 1',
    },
    { name: 'ck_collection_wishlist', expression: '`is_wishlisted` in (0,1)' },
  ],
  properties: {
    user: {
      primary: true,
      kind: 'm:1',
      entity: () => User,
      ref: true,
      updateRule: 'restrict',
      foreignKeyName: 'fk_collection_user',
      index: false,
    },
    variant: {
      primary: true,
      kind: 'm:1',
      entity: () => PlayerVariant,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_collection_variant',
      index: 'fk_collection_variant',
    },
    isOwned: { type: 'boolean' },
    isWishlisted: { type: 'boolean' },
    updatedAt: {
      type: 'datetime',
      columnType: 'timestamp(3)',
      defaultRaw: `current_timestamp(3)`,
      extra: 'on update current_timestamp(3)',
    },
  },
});
