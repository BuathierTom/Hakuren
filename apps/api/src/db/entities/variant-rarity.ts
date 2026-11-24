import { EntitySchema, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import { PlayerVariant } from './player-variant.js';
import { Rarity } from './rarity.js';
import { SourceRecord } from './source-record.js';

export class VariantRarity {
  [PrimaryKeyProp]?: ['variant', 'rarity'];
  variant!: Ref<PlayerVariant>;
  rarity!: Ref<Rarity>;
  sourceRecord?: Ref<SourceRecord> | null;
}

export const VariantRaritySchema = new EntitySchema({
  class: VariantRarity,
  tableName: 'variant_rarities',
  properties: {
    variant: {
      primary: true,
      kind: 'm:1',
      entity: () => PlayerVariant,
      ref: true,
      updateRule: 'restrict',
      foreignKeyName: 'fk_variant_rarity_variant',
      index: false,
    },
    rarity: {
      primary: true,
      kind: 'm:1',
      entity: () => Rarity,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_variant_rarity_rarity',
      index: 'fk_variant_rarity_rarity',
    },
    sourceRecord: {
      kind: 'm:1',
      entity: () => SourceRecord,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_variant_rarity_source',
      index: 'fk_variant_rarity_source',
    },
  },
});
