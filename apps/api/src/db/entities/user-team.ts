import type { Team } from '../../../../../shared/teams.js';
import { EntitySchema, type Opt, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import { User } from './user.js';

export class UserTeam {
  [PrimaryKeyProp]?: ['user', 'teamId'];
  user!: Ref<User>;
  teamId!: string;
  payload!: Team;
  revision: number & Opt = 1;
  updatedAt!: Date;
}

export const UserTeamSchema = new EntitySchema({
  class: UserTeam,
  tableName: 'user_teams',
  indexes: [{ name: 'idx_user_team_updated', properties: ['user', 'updatedAt'] }],
  properties: {
    user: {
      primary: true,
      kind: 'm:1',
      entity: () => User,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_user_team_owner',
      index: false,
    },
    teamId: { primary: true, type: 'string', length: 80, collation: 'ascii_bin' },
    payload: { type: 'json' },
    revision: { type: 'integer', unsigned: true },
    updatedAt: { type: 'datetime', length: 3 },
  },
});
