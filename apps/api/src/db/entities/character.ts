import { EntitySchema, type Ref } from '@mikro-orm/core';
import { SourceRecord } from './source-record.js';

export class Character {
  id!: number;
  slug!: string;
  name!: string;
  sourceRecord?: Ref<SourceRecord> | null;
}

export const CharacterSchema = new EntitySchema({
  class: Character,
  tableName: 'characters',
  properties: {
    id: { primary: true, type: 'integer' },
    slug: { type: 'string', length: 120, collation: 'ascii_bin', unique: 'slug' },
    name: { type: 'string', length: 191 },
    sourceRecord: {
      kind: 'm:1',
      entity: () => SourceRecord,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_character_source',
      index: 'fk_character_source',
    },
  },
});
