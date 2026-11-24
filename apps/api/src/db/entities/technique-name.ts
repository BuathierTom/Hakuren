import { EntitySchema, type Opt, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import { SourceRecord } from './source-record.js';
import { Technique } from './technique.js';

export class TechniqueName {
  [PrimaryKeyProp]?: ['technique', 'locale', 'name'];
  technique!: Ref<Technique>;
  locale!: string;
  name!: string;
  isPreferred: boolean & Opt = false;
  sourceRecord?: Ref<SourceRecord> | null;
}

export const TechniqueNameSchema = new EntitySchema({
  class: TechniqueName,
  tableName: 'technique_names',
  checks: [{ name: 'ck_technique_name_preferred', expression: '`is_preferred` in (0,1)' }],
  properties: {
    technique: {
      primary: true,
      kind: 'm:1',
      entity: () => Technique,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_technique_name_technique',
      index: false,
    },
    locale: { primary: true, type: 'string', length: 16, collation: 'ascii_bin' },
    name: {
      primary: true,
      type: 'string',
      length: 191,
      index: 'idx_technique_alias',
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
      foreignKeyName: 'fk_technique_name_source',
      index: 'fk_technique_name_source',
    },
  },
});
