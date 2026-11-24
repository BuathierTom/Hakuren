import { EntitySchema, type Opt, type Ref } from '@mikro-orm/core';
import { GameContext } from './game-context.js';
import { PlayerVariant } from './player-variant.js';
import { SourceRecord } from './source-record.js';
import { Technique } from './technique.js';

export class VariantLearnset {
  id!: number;
  variant!: Ref<PlayerVariant>;
  technique!: Ref<Technique>;
  context!: Ref<GameContext>;
  sourceRecord!: Ref<SourceRecord>;
  sourceEntryKey!: string;
  sourceSection?: string | null = null;
  unlockLevel?: number | null = NaN;
  alternatePath?: boolean | null = true;
  basaraOnly?: boolean | null = true;
  rarityScope: TVariantLearnsetsRarityScope & Opt = 'unknown';
  sourceFlags?: unknown | null;
  isCurrent: boolean & Opt = true;
}

export const VariantLearnsetsRarityScope = {
  UNKNOWN: 'unknown',
  UNRESTRICTED: 'unrestricted',
  RESTRICTED: 'restricted',
} as const;

export type TVariantLearnsetsRarityScope =
  (typeof VariantLearnsetsRarityScope)[keyof typeof VariantLearnsetsRarityScope];

export const VariantLearnsetSchema = new EntitySchema({
  class: VariantLearnset,
  tableName: 'variant_learnsets',
  indexes: [
    {
      name: 'idx_learnset_lookup',
      properties: ['variant', 'context', 'isCurrent'],
    },
    {
      name: 'idx_technique_users',
      properties: ['technique', 'context', 'variant'],
    },
  ],
  uniques: [
    {
      name: 'uq_learnset_entry',
      properties: ['variant', 'sourceRecord', 'sourceEntryKey'],
    },
    { name: 'uq_learnset_variant', properties: ['id', 'variant'] },
  ],
  checks: [
    {
      name: 'ck_learnset_basara',
      expression: '`basara_only` is null or `basara_only` in (0,1)',
    },
    { name: 'ck_learnset_current', expression: '`is_current` in (0,1)' },
    {
      name: 'ck_learnset_level',
      expression: '`unlock_level` is null or `unlock_level` > 0',
    },
    {
      name: 'ck_learnset_path',
      expression: '`alternate_path` is null or `alternate_path` in (0,1)',
    },
  ],
  properties: {
    id: { primary: true, type: 'integer' },
    variant: {
      kind: 'm:1',
      entity: () => PlayerVariant,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_learnset_variant',
      index: false,
    },
    technique: {
      kind: 'm:1',
      entity: () => Technique,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_learnset_technique',
      index: false,
    },
    context: {
      kind: 'm:1',
      entity: () => GameContext,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_learnset_context',
      index: 'fk_learnset_context',
    },
    sourceRecord: {
      kind: 'm:1',
      entity: () => SourceRecord,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_learnset_source',
      index: 'fk_learnset_source',
    },
    sourceEntryKey: { type: 'string', length: 96, collation: 'ascii_bin' },
    sourceSection: {
      type: 'string',
      length: 64,
      nullable: true,
      collation: 'ascii_bin',
    },
    unlockLevel: {
      type: 'smallint',
      unsigned: true,
      nullable: true,
      defaultRaw: `NULL`,
    },
    alternatePath: { type: 'boolean', nullable: true, defaultRaw: `NULL` },
    basaraOnly: { type: 'boolean', nullable: true, defaultRaw: `NULL` },
    rarityScope: { enum: true, items: () => VariantLearnsetsRarityScope },
    sourceFlags: { type: 'json', nullable: true, defaultRaw: `NULL` },
    isCurrent: { type: 'boolean' },
  },
});
