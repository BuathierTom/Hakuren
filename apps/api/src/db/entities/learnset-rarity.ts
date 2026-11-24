import { EntitySchema, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import { Rarity } from './rarity.js';
import { SourceRecord } from './source-record.js';
import { VariantLearnset } from './variant-learnset.js';

export class LearnsetRarity {
  [PrimaryKeyProp]?: ['learnset', 'rarity'];
  learnset!: Ref<VariantLearnset>;
  rarity!: Ref<Rarity>;
  sourceRecord?: Ref<SourceRecord> | null;
}

export const LearnsetRaritySchema = new EntitySchema({
  class: LearnsetRarity,
  tableName: 'learnset_rarities',
  properties: {
    learnset: {
      primary: true,
      kind: 'm:1',
      entity: () => VariantLearnset,
      ref: true,
      updateRule: 'restrict',
      foreignKeyName: 'fk_learnset_rarity_learnset',
      index: false,
    },
    rarity: {
      primary: true,
      kind: 'm:1',
      entity: () => Rarity,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_learnset_rarity_rarity',
      index: 'fk_learnset_rarity_rarity',
    },
    sourceRecord: {
      kind: 'm:1',
      entity: () => SourceRecord,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_learnset_rarity_source',
      index: 'fk_learnset_rarity_source',
    },
  },
});
