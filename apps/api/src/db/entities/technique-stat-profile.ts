import { EntitySchema, type Ref } from '@mikro-orm/core';
import { GameContext } from './game-context.js';
import { Rarity } from './rarity.js';
import { SourceRecord } from './source-record.js';
import { Technique } from './technique.js';

export class TechniqueStatProfile {
  id!: number;
  technique!: Ref<Technique>;
  context!: Ref<GameContext>;
  profileKey!: string;
  rarity?: Ref<Rarity> | null;
  power?: number | null = NaN;
  cost?: number | null = NaN;
  parameters?: unknown | null;
  sourceRecord?: Ref<SourceRecord> | null;
}

export const TechniqueStatProfileSchema = new EntitySchema({
  class: TechniqueStatProfile,
  tableName: 'technique_stat_profiles',
  uniques: [
    {
      name: 'uq_technique_profile',
      properties: ['technique', 'context', 'profileKey'],
    },
  ],
  properties: {
    id: { primary: true, type: 'integer' },
    technique: {
      kind: 'm:1',
      entity: () => Technique,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_technique_stat_technique',
      index: false,
    },
    context: {
      kind: 'm:1',
      entity: () => GameContext,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_technique_stat_context',
      index: 'fk_technique_stat_context',
    },
    profileKey: { type: 'string', length: 96, collation: 'ascii_bin' },
    rarity: {
      kind: 'm:1',
      entity: () => Rarity,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_technique_stat_rarity',
      index: 'fk_technique_stat_rarity',
    },
    power: {
      type: 'smallint',
      unsigned: true,
      nullable: true,
      defaultRaw: `NULL`,
    },
    cost: { type: 'smallint', unsigned: true, nullable: true, defaultRaw: `NULL` },
    parameters: { type: 'json', nullable: true, defaultRaw: `NULL` },
    sourceRecord: {
      kind: 'm:1',
      entity: () => SourceRecord,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_technique_stat_source',
      index: 'fk_technique_stat_source',
    },
  },
});
