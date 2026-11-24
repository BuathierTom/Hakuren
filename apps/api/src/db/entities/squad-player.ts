import { EntitySchema, type Ref } from '@mikro-orm/core';
import { Squad } from './squad.js';
import { VariantRarity } from './variant-rarity.js';

export class SquadPlayer {
  id!: number;
  squad!: Ref<Squad>;
  variant!: Ref<VariantRarity>;
  slotKind!: TSquadPlayersSlotKind;
  slotNumber!: number;
}

export const SquadPlayersSlotKind = {
  STARTER: 'starter',
  SUBSTITUTE: 'substitute',
} as const;

export type TSquadPlayersSlotKind =
  (typeof SquadPlayersSlotKind)[keyof typeof SquadPlayersSlotKind];

export const SquadPlayerSchema = new EntitySchema({
  class: SquadPlayer,
  tableName: 'squad_players',
  uniques: [
    {
      name: 'uq_squad_player_variant',
      expression:
        'alter table `squad_players` add unique `uq_squad_player_variant` (`id`, `variant_id`)',
    },
    { name: 'uq_squad_slot', properties: ['squad', 'slotKind', 'slotNumber'] },
    {
      name: 'uq_squad_variant',
      expression:
        'alter table `squad_players` add unique `uq_squad_variant` (`squad_id`, `variant_id`)',
    },
  ],
  checks: [
    {
      name: 'ck_squad_player_slot',
      expression: "`slot_number` > 0 and (`slot_kind` <> 'starter' or `slot_number` <= 11)",
    },
  ],
  properties: {
    id: { primary: true, type: 'integer' },
    squad: {
      kind: 'm:1',
      entity: () => Squad,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_squad_player_squad',
      index: false,
    },
    variant: {
      kind: 'm:1',
      entity: () => VariantRarity,
      ref: true,
      fieldNames: ['variant_id', 'rarity_id'],
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_squad_player_availability',
      index: 'fk_squad_player_availability',
    },
    slotKind: { enum: true, items: () => SquadPlayersSlotKind },
    slotNumber: { type: 'tinyint', unsigned: true },
  },
});
