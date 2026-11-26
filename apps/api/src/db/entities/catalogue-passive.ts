import type { CatalogueTranslations } from '../../../../../shared/catalogue.js';
import { EntitySchema, type Opt } from '@mikro-orm/core';

export class CataloguePassive {
  translations?: CatalogueTranslations | null;
  id!: number;
  gameId!: string;
  stringId!: string;
  name!: string;
  description!: string;
  source!: TCataloguePassivesSource;
  playStyle?: TCataloguePassivesPlayStyle | null = null;
  value!: string;
  unit!: TCataloguePassivesUnit;
  icon?: number | null = NaN;
  family?: number | null = NaN;
  tier?: number | null = NaN;
  sourceUrl!: string;
  isPublished: boolean & Opt = true;
}

export const CataloguePassivesSource = {
  PLAYER: 'player',
  CUSTOM: 'custom',
  COACH: 'coach',
  MANAGER: 'manager',
} as const;

export type TCataloguePassivesSource =
  (typeof CataloguePassivesSource)[keyof typeof CataloguePassivesSource];

export const CataloguePassivesPlayStyle = {
  BREACH: 'breach',
  TENSION: 'tension',
  COUNTER: 'counter',
  BOND: 'bond',
  ROUGH_PLAY: 'rough_play',
  JUSTICE: 'justice',
} as const;

export type TCataloguePassivesPlayStyle =
  (typeof CataloguePassivesPlayStyle)[keyof typeof CataloguePassivesPlayStyle];

export const CataloguePassivesUnit = {
  PERCENT: 'percent',
  POINTS: 'points',
} as const;

export type TCataloguePassivesUnit =
  (typeof CataloguePassivesUnit)[keyof typeof CataloguePassivesUnit];

export const CataloguePassiveSchema = new EntitySchema({
  class: CataloguePassive,
  tableName: 'catalogue_passives',
  indexes: [
    {
      name: 'idx_passive_list',
      properties: ['isPublished', 'source', 'playStyle', 'id'],
    },
  ],
  properties: {
    translations: { type: 'json', nullable: true, defaultRaw: `NULL` },
    id: { primary: true, type: 'integer' },
    gameId: {
      type: 'string',
      length: 24,
      collation: 'ascii_bin',
      unique: 'game_id',
    },
    stringId: {
      type: 'string',
      length: 96,
      collation: 'ascii_bin',
      unique: 'string_id',
    },
    name: { type: 'text', length: 65535 },
    description: { type: 'text', length: 65535 },
    source: { enum: true, items: () => CataloguePassivesSource },
    playStyle: {
      enum: true,
      items: () => CataloguePassivesPlayStyle,
      nullable: true,
    },
    value: { type: 'decimal', precision: 10, scale: 4 },
    unit: { enum: true, items: () => CataloguePassivesUnit },
    icon: { type: 'smallint', unsigned: true, nullable: true, defaultRaw: `NULL` },
    family: {
      type: 'integer',
      unsigned: true,
      nullable: true,
      defaultRaw: `NULL`,
    },
    tier: { type: 'tinyint', unsigned: true, nullable: true, defaultRaw: `NULL` },
    sourceUrl: { type: 'string', length: 1024 },
    isPublished: { type: 'boolean' },
  },
});
