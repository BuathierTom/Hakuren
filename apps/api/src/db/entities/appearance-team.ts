import { EntitySchema, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import { HistoricalTeam } from './historical-team.js';
import { SourceRecord } from './source-record.js';
import { VariantAppearance } from './variant-appearance.js';

export class AppearanceTeam {
  [PrimaryKeyProp]?: ['appearance', 'historicalTeam'];
  appearance!: Ref<VariantAppearance>;
  historicalTeam!: Ref<HistoricalTeam>;
  sourceRecord?: Ref<SourceRecord> | null;
}

export const AppearanceTeamSchema = new EntitySchema({
  class: AppearanceTeam,
  tableName: 'appearance_teams',
  indexes: [{ name: 'idx_appearance_team', properties: ['historicalTeam', 'appearance'] }],
  properties: {
    appearance: {
      primary: true,
      kind: 'm:1',
      entity: () => VariantAppearance,
      ref: true,
      updateRule: 'restrict',
      foreignKeyName: 'fk_membership_appearance',
      index: false,
    },
    historicalTeam: {
      primary: true,
      kind: 'm:1',
      entity: () => HistoricalTeam,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_membership_team',
      index: false,
    },
    sourceRecord: {
      kind: 'm:1',
      entity: () => SourceRecord,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_membership_source',
      index: 'fk_membership_source',
    },
  },
});
