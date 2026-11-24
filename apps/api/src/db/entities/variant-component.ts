import { EntitySchema, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import { Character } from './character.js';
import { PlayerVariant } from './player-variant.js';
import { SourceRecord } from './source-record.js';

export class VariantComponent {
  [PrimaryKeyProp]?: ['variant', 'character', 'role'];
  variant!: Ref<PlayerVariant>;
  character!: Ref<Character>;
  role!: TVariantComponentsRole;
  sourceRecord?: Ref<SourceRecord> | null;
}

export const VariantComponentsRole = {
  BASE: 'base',
  DONOR: 'donor',
} as const;

export type TVariantComponentsRole =
  (typeof VariantComponentsRole)[keyof typeof VariantComponentsRole];

export const VariantComponentSchema = new EntitySchema({
  class: VariantComponent,
  tableName: 'variant_components',
  properties: {
    variant: {
      primary: true,
      kind: 'm:1',
      entity: () => PlayerVariant,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_component_variant',
      index: false,
    },
    character: {
      primary: true,
      kind: 'm:1',
      entity: () => Character,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_component_character',
      index: 'fk_component_character',
    },
    role: { primary: true, enum: true, items: () => VariantComponentsRole },
    sourceRecord: {
      kind: 'm:1',
      entity: () => SourceRecord,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_component_source',
      index: 'fk_component_source',
    },
  },
});
