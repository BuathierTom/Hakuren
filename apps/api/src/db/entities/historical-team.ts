import { EntitySchema, type Ref } from '@mikro-orm/core';
import { SourceRecord } from './source-record.js';

export class HistoricalTeam {
  id!: number;
  slug!: string;
  name!: string;
  sourceRecord?: Ref<SourceRecord> | null;
}

export const HistoricalTeamSchema = new EntitySchema({
  class: HistoricalTeam,
  tableName: 'historical_teams',
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
      foreignKeyName: 'fk_historical_team_source',
      index: 'fk_historical_team_source',
    },
  },
});
