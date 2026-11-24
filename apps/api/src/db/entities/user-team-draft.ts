import type { Team } from '../../../../../shared/teams.js';
import { EntitySchema, type Opt, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import { User } from './user.js';

export class UserTeamDraft {
  [PrimaryKeyProp]?: 'user';
  user!: Ref<User>;
  payload!: Team;
  revision: number & Opt = 1;
  updatedAt!: Date;
}

export const UserTeamDraftSchema = new EntitySchema({
  class: UserTeamDraft,
  tableName: 'user_team_drafts',
  properties: {
    user: {
      primary: true,
      kind: '1:1',
      entity: () => User,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_user_team_draft_owner',
      index: false,
    },
    payload: { type: 'json' },
    revision: { type: 'integer', unsigned: true },
    updatedAt: { type: 'datetime', length: 3 },
  },
});
