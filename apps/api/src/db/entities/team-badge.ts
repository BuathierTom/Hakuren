import { EntitySchema, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import { HistoricalTeam } from './historical-team.js';

export class TeamBadge {
  [PrimaryKeyProp]?: 'historicalTeam';
  historicalTeam!: Ref<HistoricalTeam>;
  imageUrl!: string;
  sourceUrl!: string;
}

export const TeamBadgeSchema = new EntitySchema({
  class: TeamBadge,
  tableName: 'team_badges',
  properties: {
    historicalTeam: {
      primary: true,
      kind: '1:1',
      entity: () => HistoricalTeam,
      ref: true,
      updateRule: 'restrict',
      foreignKeyName: 'fk_team_badge_team',
      index: false,
    },
    imageUrl: { type: 'string', length: 1024 },
    sourceUrl: { type: 'string', length: 1024 },
  },
});
