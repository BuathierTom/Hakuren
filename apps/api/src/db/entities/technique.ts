import { EntitySchema, type Opt, type Ref } from '@mikro-orm/core';
import { SourceRecord } from './source-record.js';

export class Technique {
  id!: number;
  gameId?: string | null = null;
  stringId?: string | null = null;
  kind?: TTechniquesKind | null = null;
  description?: string | null = null;
  power?: number | null = NaN;
  tension?: number | null = NaN;
  cooldown?: number | null = NaN;
  notes?: unknown | null;
  grantedGameId?: string | null = null;
  isPublished: boolean & Opt = true;
  slug!: string;
  name!: string;
  category?: TTechniquesCategory | null = null;
  element?: TTechniquesElement | null = null;
  previewUrl?: string | null = null;
  previewMimeType?: string | null = null;
  sourceRecord?: Ref<SourceRecord> | null;
}

export const TechniquesKind = {
  HISSATSU: 'hissatsu',
  AURA_HISSATSU: 'aura_hissatsu',
  AURA: 'aura',
} as const;

export type TTechniquesKind = (typeof TechniquesKind)[keyof typeof TechniquesKind];

export const TechniquesCategory = {
  SHOOT: 'shoot',
  DRIBBLE: 'dribble',
  BLOCK: 'block',
  CATCH: 'catch',
  KESHIN: 'keshin',
  KESHIN_ARMED: 'keshin_armed',
  MIXIMAX: 'miximax',
  TOTEM: 'totem',
  BOND_TRANSFORM: 'bond_transform',
  AWAKENING_POWER: 'awakening_power',
  MODE_CHANGE: 'mode_change',
  AWAKENING_CHANGE: 'awakening_change',
  TACTIC: 'tactic',
  PASSIVE: 'passive',
  OTHER: 'other',
} as const;

export type TTechniquesCategory = (typeof TechniquesCategory)[keyof typeof TechniquesCategory];

export const TechniquesElement = {
  WIND: 'wind',
  FOREST: 'forest',
  FIRE: 'fire',
  MOUNTAIN: 'mountain',
  VOID: 'void',
} as const;

export type TTechniquesElement = (typeof TechniquesElement)[keyof typeof TechniquesElement];

export const TechniqueSchema = new EntitySchema({
  class: Technique,
  tableName: 'techniques',
  indexes: [{ name: 'idx_technique_filters', properties: ['category', 'element', 'id'] }],
  properties: {
    id: { primary: true, type: 'integer' },
    gameId: {
      type: 'string',
      length: 24,
      nullable: true,
      collation: 'ascii_bin',
      unique: 'game_id',
    },
    stringId: {
      type: 'string',
      length: 96,
      nullable: true,
      collation: 'ascii_bin',
    },
    kind: { enum: true, items: () => TechniquesKind, nullable: true },
    description: { type: 'text', length: 65535, nullable: true },
    power: {
      type: 'smallint',
      unsigned: true,
      nullable: true,
      defaultRaw: `NULL`,
    },
    tension: {
      type: 'smallint',
      unsigned: true,
      nullable: true,
      defaultRaw: `NULL`,
    },
    cooldown: {
      type: 'smallint',
      unsigned: true,
      nullable: true,
      defaultRaw: `NULL`,
    },
    notes: { type: 'json', nullable: true, defaultRaw: `NULL` },
    grantedGameId: {
      type: 'string',
      length: 24,
      nullable: true,
      collation: 'ascii_bin',
    },
    isPublished: { type: 'boolean' },
    slug: { type: 'string', length: 120, collation: 'ascii_bin', unique: 'slug' },
    name: { type: 'string', length: 191, index: 'idx_technique_name' },
    category: { enum: true, items: () => TechniquesCategory, nullable: true },
    element: { enum: true, items: () => TechniquesElement, nullable: true },
    previewUrl: { type: 'string', length: 1024, nullable: true },
    previewMimeType: { type: 'string', length: 96, nullable: true },
    sourceRecord: {
      kind: 'm:1',
      entity: () => SourceRecord,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_technique_source',
      index: 'fk_technique_source',
    },
  },
});
