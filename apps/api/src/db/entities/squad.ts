import { EntitySchema, type Opt, type Ref } from '@mikro-orm/core';
import { Formation } from './formation.js';
import { GameContext } from './game-context.js';
import { User } from './user.js';

export class Squad {
  id!: number;
  user!: Ref<User>;
  name!: string;
  formation?: Ref<Formation> | null;
  context?: Ref<GameContext> | null;
  createdAt!: Date & Opt;
  updatedAt!: Date & Opt;
}

export const SquadSchema = new EntitySchema({
  class: Squad,
  tableName: 'squads',
  indexes: [{ name: 'idx_squad_owner', properties: ['user', 'updatedAt', 'id'] }],
  properties: {
    id: { primary: true, type: 'integer' },
    user: {
      kind: 'm:1',
      entity: () => User,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_squad_user',
      index: false,
    },
    name: { type: 'string', length: 120 },
    formation: {
      kind: 'm:1',
      entity: () => Formation,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_squad_formation',
      index: 'fk_squad_formation',
    },
    context: {
      kind: 'm:1',
      entity: () => GameContext,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_squad_context',
      index: 'fk_squad_context',
    },
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
