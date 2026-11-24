import { EntitySchema, type Opt, type Ref } from '@mikro-orm/core';
import { SourceRecord } from './source-record.js';

export class CatalogueItem {
  id!: number;
  section!: TCatalogueItemsSection;
  gameId!: string;
  stringId!: string;
  name!: string;
  description?: string | null = null;
  slot?: TCatalogueItemsSlot | null = null;
  imageUrl?: string | null = null;
  tension?: string | null;
  stats?: unknown | null;
  isPublished: boolean & Opt = true;
  sourceRecord?: Ref<SourceRecord> | null;
}

export const CatalogueItemsSection = {
  EQUIPMENT: 'equipment',
  TACTICS: 'tactics',
} as const;

export type TCatalogueItemsSection =
  (typeof CatalogueItemsSection)[keyof typeof CatalogueItemsSection];

export const CatalogueItemsSlot = {
  BOOTS: 'boots',
  BRACELET: 'bracelet',
  PENDANT: 'pendant',
  ACCESSORY: 'accessory',
} as const;

export type TCatalogueItemsSlot = (typeof CatalogueItemsSlot)[keyof typeof CatalogueItemsSlot];

export const CatalogueItemSchema = new EntitySchema({
  class: CatalogueItem,
  tableName: 'catalogue_items',
  indexes: [
    {
      name: 'idx_catalogue_item_list',
      properties: ['section', 'isPublished', 'slot', 'id'],
    },
  ],
  uniques: [{ name: 'uq_catalogue_item', properties: ['section', 'stringId'] }],
  properties: {
    id: { primary: true, type: 'integer' },
    section: { enum: true, items: () => CatalogueItemsSection },
    gameId: { type: 'string', length: 24, collation: 'ascii_bin' },
    stringId: { type: 'string', length: 96, collation: 'ascii_bin' },
    name: { type: 'string', length: 191 },
    description: { type: 'text', length: 65535, nullable: true },
    slot: { enum: true, items: () => CatalogueItemsSlot, nullable: true },
    imageUrl: { type: 'string', length: 1024, nullable: true },
    tension: {
      type: 'decimal',
      precision: 10,
      scale: 4,
      unsigned: true,
      nullable: true,
      defaultRaw: `NULL`,
    },
    stats: { type: 'json', nullable: true, defaultRaw: `NULL` },
    isPublished: { type: 'boolean' },
    sourceRecord: {
      kind: 'm:1',
      entity: () => SourceRecord,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_catalogue_item_source',
      index: 'fk_catalogue_item_source',
    },
  },
});
