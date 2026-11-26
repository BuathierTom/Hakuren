import type { CatalogueTranslations } from '../../../../../shared/catalogue.js';
import { EntitySchema, type Ref } from '@mikro-orm/core';
import { Character } from './character.js';
import { SourceRecord } from './source-record.js';
import { Work } from './work.js';

export class PlayerVariant {
  translations?: CatalogueTranslations | null;
  id!: number;
  character?: Ref<Character> | null;
  name!: string;
  variantLabel?: string | null = null;
  originWork?: Ref<Work> | null;
  element?: TPlayerVariantsElement | null = null;
  position?: TPlayerVariantsPosition | null = null;
  role?: string | null = null;
  gender?: TPlayerVariantsGender | null = null;
  playStyle?: TPlayerVariantsPlayStyle | null = null;
  styleSourceRecord?: Ref<SourceRecord> | null;
  ageGroup?: string | null = null;
  schoolYear?: string | null = null;
  portraitUrl?: string | null = null;
  sourceRecord?: Ref<SourceRecord> | null;
}

export const PlayerVariantsElement = {
  WIND: 'wind',
  FOREST: 'forest',
  FIRE: 'fire',
  MOUNTAIN: 'mountain',
  VOID: 'void',
} as const;

export type TPlayerVariantsElement =
  (typeof PlayerVariantsElement)[keyof typeof PlayerVariantsElement];

export const PlayerVariantsPosition = {
  GK: 'GK',
  DF: 'DF',
  MF: 'MF',
  FW: 'FW',
} as const;

export type TPlayerVariantsPosition =
  (typeof PlayerVariantsPosition)[keyof typeof PlayerVariantsPosition];

export const PlayerVariantsGender = {
  MALE: 'male',
  FEMALE: 'female',
  NEUTRAL: 'neutral',
} as const;

export type TPlayerVariantsGender =
  (typeof PlayerVariantsGender)[keyof typeof PlayerVariantsGender];

export const PlayerVariantsPlayStyle = {
  BREACH: 'breach',
  TENSION: 'tension',
  COUNTER: 'counter',
  BOND: 'bond',
  ROUGH_PLAY: 'rough_play',
  JUSTICE: 'justice',
} as const;

export type TPlayerVariantsPlayStyle =
  (typeof PlayerVariantsPlayStyle)[keyof typeof PlayerVariantsPlayStyle];

export const PlayerVariantSchema = new EntitySchema({
  class: PlayerVariant,
  tableName: 'player_variants',
  indexes: [
    { name: 'idx_variant_filters', properties: ['position', 'element', 'id'] },
    { name: 'idx_variant_origin', properties: ['originWork', 'id'] },
    { name: 'idx_variant_profile', properties: ['gender', 'playStyle', 'id'] },
  ],
  properties: {
    translations: { type: 'json', nullable: true, defaultRaw: `NULL` },
    id: { primary: true, type: 'integer' },
    character: {
      kind: 'm:1',
      entity: () => Character,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_variant_character',
      index: 'fk_variant_character',
    },
    name: { type: 'string', length: 191, index: 'idx_variant_name' },
    variantLabel: { type: 'string', length: 191, nullable: true },
    originWork: {
      kind: 'm:1',
      entity: () => Work,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_variant_origin',
      index: false,
    },
    element: { enum: true, items: () => PlayerVariantsElement, nullable: true },
    position: { enum: true, items: () => PlayerVariantsPosition, nullable: true },
    role: { type: 'string', length: 32, nullable: true },
    gender: { enum: true, items: () => PlayerVariantsGender, nullable: true },
    playStyle: {
      enum: true,
      items: () => PlayerVariantsPlayStyle,
      nullable: true,
    },
    styleSourceRecord: {
      kind: 'm:1',
      entity: () => SourceRecord,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_variant_style_source',
      index: 'fk_variant_style_source',
    },
    ageGroup: { type: 'string', length: 32, nullable: true },
    schoolYear: { type: 'string', length: 32, nullable: true },
    portraitUrl: { type: 'string', length: 1024, nullable: true },
    sourceRecord: {
      kind: 'm:1',
      entity: () => SourceRecord,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_variant_source',
      index: 'fk_variant_source',
    },
  },
});
