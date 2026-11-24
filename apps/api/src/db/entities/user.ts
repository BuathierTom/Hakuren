import { EntitySchema, type Opt } from '@mikro-orm/core';

export class User {
  id!: number;
  discordId!: string;
  displayName!: string;
  avatarUrl?: string | null = null;
  createdAt!: Date & Opt;
  updatedAt!: Date & Opt;
}

export const UserSchema = new EntitySchema({
  class: User,
  tableName: 'users',
  properties: {
    id: { primary: true, type: 'integer' },
    discordId: {
      type: 'string',
      length: 20,
      collation: 'ascii_bin',
      unique: 'discord_id',
    },
    displayName: { type: 'string', length: 120 },
    avatarUrl: { type: 'string', length: 1024, nullable: true },
    createdAt: {
      type: 'datetime',
      columnType: 'timestamp(3)',
      defaultRaw: `current_timestamp(3)`,
    },
    updatedAt: {
      type: 'datetime',
      columnType: 'timestamp(3)',
      defaultRaw: `current_timestamp(3)`,
      extra: 'on update current_timestamp(3)',
    },
  },
});
