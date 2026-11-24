import { EntitySchema, type Opt, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import { PlayerVariant } from './player-variant.js';
import { SourceRecord } from './source-record.js';

export class VariantSourceLink {
  [PrimaryKeyProp]?: ['variant', 'sourceRecord', 'scope'];
  variant!: Ref<PlayerVariant>;
  sourceRecord!: Ref<SourceRecord>;
  scope!: TVariantSourceLinksScope;
  matchStatus: TVariantSourceLinksMatchStatus & Opt = 'pending';
}

export const VariantSourceLinksScope = {
  IDENTITY: 'identity',
  TECHNIQUES: 'techniques',
  ACQUISITION: 'acquisition',
} as const;

export type TVariantSourceLinksScope =
  (typeof VariantSourceLinksScope)[keyof typeof VariantSourceLinksScope];

export const VariantSourceLinksMatchStatus = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

export type TVariantSourceLinksMatchStatus =
  (typeof VariantSourceLinksMatchStatus)[keyof typeof VariantSourceLinksMatchStatus];

export const VariantSourceLinkSchema = new EntitySchema({
  class: VariantSourceLink,
  tableName: 'variant_source_links',
  indexes: [{ name: 'idx_variant_match', properties: ['matchStatus', 'scope'] }],
  properties: {
    variant: {
      primary: true,
      kind: 'm:1',
      entity: () => PlayerVariant,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_variant_link_variant',
      index: false,
    },
    sourceRecord: {
      primary: true,
      kind: 'm:1',
      entity: () => SourceRecord,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_variant_link_record',
      index: 'fk_variant_link_record',
    },
    scope: { primary: true, enum: true, items: () => VariantSourceLinksScope },
    matchStatus: { enum: true, items: () => VariantSourceLinksMatchStatus },
  },
});
