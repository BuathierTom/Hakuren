import { EntitySchema, type Ref } from '@mikro-orm/core';
import { GameContext } from './game-context.js';
import { PlayerVariant } from './player-variant.js';
import { Rarity } from './rarity.js';
import { SourceRecord } from './source-record.js';

export class PlayerStatProfile {
  id!: number;
  variant!: Ref<PlayerVariant>;
  context!: Ref<GameContext>;
  profileKey!: string;
  rarity?: Ref<Rarity> | null;
  level?: number | null = NaN;
  power?: number | null = NaN;
  control?: number | null = NaN;
  technique?: number | null = NaN;
  pressure?: number | null = NaN;
  physical?: number | null = NaN;
  agility?: number | null = NaN;
  intelligence?: number | null = NaN;
  sourceRecord?: Ref<SourceRecord> | null;
}

export const PlayerStatProfileSchema = new EntitySchema({
  class: PlayerStatProfile,
  tableName: 'player_stat_profiles',
  uniques: [
    {
      name: 'uq_player_profile',
      properties: ['variant', 'context', 'profileKey'],
    },
  ],
  checks: [{ name: 'ck_player_stat_level', expression: '`level` is null or `level` > 0' }],
  properties: {
    id: { primary: true, type: 'integer' },
    variant: {
      kind: 'm:1',
      entity: () => PlayerVariant,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_stat_variant',
      index: false,
    },
    context: {
      kind: 'm:1',
      entity: () => GameContext,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_stat_context',
      index: 'fk_stat_context',
    },
    profileKey: { type: 'string', length: 96, collation: 'ascii_bin' },
    rarity: {
      kind: 'm:1',
      entity: () => Rarity,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_stat_rarity',
      index: 'fk_stat_rarity',
    },
    level: {
      type: 'smallint',
      unsigned: true,
      nullable: true,
      defaultRaw: `NULL`,
    },
    power: {
      type: 'smallint',
      unsigned: true,
      nullable: true,
      defaultRaw: `NULL`,
    },
    control: {
      type: 'smallint',
      unsigned: true,
      nullable: true,
      defaultRaw: `NULL`,
    },
    technique: {
      type: 'smallint',
      unsigned: true,
      nullable: true,
      defaultRaw: `NULL`,
    },
    pressure: {
      type: 'smallint',
      unsigned: true,
      nullable: true,
      defaultRaw: `NULL`,
    },
    physical: {
      type: 'smallint',
      unsigned: true,
      nullable: true,
      defaultRaw: `NULL`,
    },
    agility: {
      type: 'smallint',
      unsigned: true,
      nullable: true,
      defaultRaw: `NULL`,
    },
    intelligence: {
      type: 'smallint',
      unsigned: true,
      nullable: true,
      defaultRaw: `NULL`,
    },
    sourceRecord: {
      kind: 'm:1',
      entity: () => SourceRecord,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      nullable: true,
      defaultRaw: `NULL`,
      foreignKeyName: 'fk_stat_source',
      index: 'fk_stat_source',
    },
  },
});
