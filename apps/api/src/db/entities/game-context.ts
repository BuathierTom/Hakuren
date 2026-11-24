import { EntitySchema, type Ref } from '@mikro-orm/core';
import { Work } from './work.js';

export class GameContext {
  id!: number;
  work!: Ref<Work>;
  modeCode!: string;
  gameVersion!: string;
}

export const GameContextSchema = new EntitySchema({
  class: GameContext,
  tableName: 'game_contexts',
  uniques: [{ name: 'uq_game_context', properties: ['work', 'modeCode', 'gameVersion'] }],
  properties: {
    id: { primary: true, type: 'integer' },
    work: {
      kind: 'm:1',
      entity: () => Work,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_context_work',
      index: false,
    },
    modeCode: { type: 'string', length: 32, collation: 'ascii_bin' },
    gameVersion: { type: 'string', length: 64, collation: 'ascii_bin' },
  },
});
