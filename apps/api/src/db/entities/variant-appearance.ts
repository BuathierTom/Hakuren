import { EntitySchema, type Ref } from '@mikro-orm/core';
import { PlayerVariant } from './player-variant.js';
import { SourceRecord } from './source-record.js';
import { Work } from './work.js';

export class VariantAppearance {
  id!: number;
  variant!: Ref<PlayerVariant>;
  work!: Ref<Work>;
  sourceRecord?: Ref<SourceRecord> | null;
}

export const VariantAppearanceSchema = new EntitySchema({
  class: VariantAppearance,
  tableName: 'variant_appearances',
  indexes: [{ name: 'idx_appearance_work', properties: ['work', 'variant'] }],
  uniques: [{ name: 'uq_variant_appearance', properties: ['variant', 'work'] }],
  properties: {
    id: { primary: true, type: 'integer' },
    variant: {
      kind: 'm:1',
      entity: () => PlayerVariant,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_appearance_variant',
      index: false,
    },
    work: {
      kind: 'm:1',
      entity: () => Work,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_appearance_work',
      index: false,
    },
    sourceRecord: {
      kind: 'm:1',
      entity: () => SourceRecord,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_appearance_source',
      index: 'fk_appearance_source',
    },
  },
});
