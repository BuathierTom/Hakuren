import { EntitySchema, type Opt, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import { User } from './user.js';

export class AuthSession {
  [PrimaryKeyProp]?: 'tokenHash';
  tokenHash!: Buffer;
  user!: Ref<User>;
  expiresAt!: Date;
  createdAt!: Date & Opt;
}

export const AuthSessionSchema = new EntitySchema({
  class: AuthSession,
  tableName: 'auth_sessions',
  properties: {
    tokenHash: { primary: true, type: 'Buffer', columnType: 'binary(32)' },
    user: {
      kind: 'm:1',
      entity: () => User,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_auth_session_user',
      index: 'idx_auth_session_user',
    },
    expiresAt: { type: 'datetime', length: 3, index: 'idx_auth_session_expiry' },
    createdAt: {
      type: 'datetime',
      columnType: 'timestamp(3)',
      defaultRaw: `current_timestamp(3)`,
    },
  },
});
