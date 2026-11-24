import { EntitySchema, type Opt, type Ref } from '@mikro-orm/core';
import { SourceRecord } from './source-record.js';

export class Work {
  id!: number;
  code!: string;
  name!: string;
  kind!: TWorksKind;
  sortOrder: number & Opt = 0;
  sourceRecord?: Ref<SourceRecord> | null;
}

export const WorksKind = {
  GAME: 'game',
  ANIME: 'anime',
} as const;

export type TWorksKind = (typeof WorksKind)[keyof typeof WorksKind];

export const WorkSchema = new EntitySchema({
  class: Work,
  tableName: 'works',
  properties: {
    id: { primary: true, type: 'integer' },
    code: { type: 'string', length: 32, collation: 'ascii_bin', unique: 'code' },
    name: { type: 'string', length: 191 },
    kind: { enum: true, items: () => WorksKind },
    sortOrder: { type: 'smallint', unsigned: true },
    sourceRecord: {
      kind: 'm:1',
      entity: () => SourceRecord,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_work_source',
      index: 'fk_work_source',
    },
  },
});
