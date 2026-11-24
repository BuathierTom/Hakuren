import { EntitySchema, PrimaryKeyProp } from '@mikro-orm/core';

export class AuthState {
  [PrimaryKeyProp]?: 'stateHash';
  stateHash!: Buffer;
  browserHash!: Buffer;
  verifier!: string;
  returnTo!: string;
  expiresAt!: Date;
}

export const AuthStateSchema = new EntitySchema({
  class: AuthState,
  tableName: 'auth_states',
  properties: {
    stateHash: { primary: true, type: 'Buffer', columnType: 'binary(32)' },
    browserHash: { type: 'Buffer', columnType: 'binary(32)' },
    verifier: { type: 'string', length: 128, collation: 'ascii_bin' },
    returnTo: { type: 'string', length: 1024 },
    expiresAt: { type: 'datetime', length: 3, index: 'idx_auth_state_expiry' },
  },
});
