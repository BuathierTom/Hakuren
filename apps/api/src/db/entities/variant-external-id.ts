import { EntitySchema, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import { DataSource } from './data-source.js';
import { PlayerVariant } from './player-variant.js';

export class VariantExternalId {
  [PrimaryKeyProp]?: ['source', 'externalKey'];
  source!: Ref<DataSource>;
  externalKey!: string;
  variant!: Ref<PlayerVariant>;
}

export const VariantExternalIdSchema = new EntitySchema({
  class: VariantExternalId,
  tableName: 'variant_external_ids',
  properties: {
    source: {
      primary: true,
      kind: 'm:1',
      entity: () => DataSource,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_variant_external_source',
      index: false,
    },
    externalKey: {
      primary: true,
      type: 'string',
      length: 191,
      collation: 'utf8mb4_bin',
    },
    variant: {
      kind: 'm:1',
      entity: () => PlayerVariant,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_variant_external_variant',
      index: 'fk_variant_external_variant',
    },
  },
});
