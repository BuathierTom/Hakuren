import { EntitySchema, type Opt, type Ref } from '@mikro-orm/core';
import { DataSource } from './data-source.js';

export class SourceRecord {
  id!: number;
  source!: Ref<DataSource>;
  entityKind!: string;
  externalKey!: string;
  sourceVersion!: string;
  sourceUrl?: string | null = null;
  retrievedAt!: Date;
  payload!: unknown;
  sha256?: string | null = null;
  reviewStatus: TSourceRecordsReviewStatus & Opt = 'pending';
  reviewNote?: string | null = null;
}

export const SourceRecordsReviewStatus = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  QUARANTINED: 'quarantined',
} as const;

export type TSourceRecordsReviewStatus =
  (typeof SourceRecordsReviewStatus)[keyof typeof SourceRecordsReviewStatus];

export const SourceRecordSchema = new EntitySchema({
  class: SourceRecord,
  tableName: 'source_records',
  indexes: [{ name: 'idx_source_review', properties: ['reviewStatus', 'entityKind'] }],
  uniques: [
    {
      name: 'uq_source_record',
      properties: ['source', 'entityKind', 'externalKey', 'sourceVersion'],
    },
  ],
  properties: {
    id: { primary: true, type: 'integer' },
    source: {
      kind: 'm:1',
      entity: () => DataSource,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_record_source',
      index: false,
    },
    entityKind: { type: 'string', length: 32, collation: 'ascii_bin' },
    externalKey: { type: 'string', length: 191, collation: 'utf8mb4_bin' },
    sourceVersion: { type: 'string', length: 96, collation: 'ascii_bin' },
    sourceUrl: { type: 'string', length: 1024, nullable: true },
    retrievedAt: { type: 'datetime', length: 3 },
    payload: { type: 'json' },
    sha256: {
      type: 'character',
      length: 64,
      nullable: true,
      collation: 'ascii_bin',
    },
    reviewStatus: { enum: true, items: () => SourceRecordsReviewStatus },
    reviewNote: { type: 'text', length: 65535, nullable: true },
  },
});
