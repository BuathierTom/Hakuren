import { EntitySchema, type Opt, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import { Character } from './character.js';
import { SourceRecord } from './source-record.js';

export class CharacterName {
  [PrimaryKeyProp]?: ['character', 'locale', 'name'];
  character!: Ref<Character>;
  locale!: string;
  name!: string;
  isPreferred: boolean & Opt = false;
  sourceRecord?: Ref<SourceRecord> | null;
}

export const CharacterNameSchema = new EntitySchema({
  class: CharacterName,
  tableName: 'character_names',
  checks: [{ name: 'ck_character_name_preferred', expression: '`is_preferred` in (0,1)' }],
  properties: {
    character: {
      primary: true,
      kind: 'm:1',
      entity: () => Character,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_character_name_character',
      index: false,
    },
    locale: { primary: true, type: 'string', length: 16, collation: 'ascii_bin' },
    name: {
      primary: true,
      type: 'string',
      length: 191,
      index: 'idx_character_name',
    },
    isPreferred: { type: 'boolean' },
    sourceRecord: {
      kind: 'm:1',
      entity: () => SourceRecord,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_character_name_source',
      index: 'fk_character_name_source',
    },
  },
});
