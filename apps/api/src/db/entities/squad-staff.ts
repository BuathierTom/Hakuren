import { EntitySchema, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import { PlayerVariant } from './player-variant.js';
import { Squad } from './squad.js';

export class SquadStaff {
  [PrimaryKeyProp]?: ['squad', 'role', 'slotNumber'];
  squad!: Ref<Squad>;
  variant!: Ref<PlayerVariant>;
  role!: TSquadStaffRole;
  slotNumber!: number;
}

export const SquadStaffRole = {
  COACH: 'coach',
  MANAGER: 'manager',
} as const;

export type TSquadStaffRole = (typeof SquadStaffRole)[keyof typeof SquadStaffRole];

export const SquadStaffSchema = new EntitySchema({
  class: SquadStaff,
  tableName: 'squad_staff',
  uniques: [{ name: 'uq_squad_staff_variant', properties: ['squad', 'variant'] }],
  checks: [{ name: 'ck_squad_staff_slot', expression: '`slot_number` > 0' }],
  properties: {
    squad: {
      primary: true,
      kind: 'm:1',
      entity: () => Squad,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_squad_staff_squad',
      index: false,
    },
    variant: {
      kind: 'm:1',
      entity: () => PlayerVariant,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_squad_staff_variant',
      index: 'fk_squad_staff_variant',
    },
    role: { primary: true, enum: true, items: () => SquadStaffRole },
    slotNumber: { primary: true, type: 'tinyint' },
  },
});
