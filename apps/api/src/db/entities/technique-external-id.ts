import { EntitySchema, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import { DataSource } from './data-source.js';
import { Technique } from './technique.js';

export class TechniqueExternalId {
  [PrimaryKeyProp]?: ['source', 'externalKey'];
  source!: Ref<DataSource>;
  externalKey!: string;
  technique!: Ref<Technique>;
}

export const TechniqueExternalIdSchema = new EntitySchema({
  class: TechniqueExternalId,
  tableName: 'technique_external_ids',
  properties: {
    source: {
      primary: true,
      kind: 'm:1',
      entity: () => DataSource,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_technique_external_source',
      index: false,
    },
    externalKey: {
      primary: true,
      type: 'string',
      length: 191,
      collation: 'utf8mb4_bin',
    },
    technique: {
      kind: 'm:1',
      entity: () => Technique,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_technique_external_technique',
      index: 'fk_technique_external_technique',
    },
  },
});
