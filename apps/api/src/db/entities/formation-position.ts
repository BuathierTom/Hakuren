import { EntitySchema, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import { Formation } from './formation.js';

export class FormationPosition {
  [PrimaryKeyProp]?: ['formation', 'slotNumber'];
  formation!: Ref<Formation>;
  slotNumber!: number;
  position!: TFormationPositionsPosition;
  x!: string;
  y!: string;
}

export const FormationPositionsPosition = {
  GK: 'GK',
  DF: 'DF',
  MF: 'MF',
  FW: 'FW',
} as const;

export type TFormationPositionsPosition =
  (typeof FormationPositionsPosition)[keyof typeof FormationPositionsPosition];

export const FormationPositionSchema = new EntitySchema({
  class: FormationPosition,
  tableName: 'formation_positions',
  checks: [
    {
      name: 'ck_formation_coordinates',
      expression: '`x` between 0 and 100 and `y` between 0 and 100',
    },
    { name: 'ck_formation_slot', expression: '`slot_number` between 1 and 11' },
  ],
  properties: {
    formation: {
      primary: true,
      kind: 'm:1',
      entity: () => Formation,
      ref: true,
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_formation_position',
      index: false,
    },
    slotNumber: { primary: true, type: 'tinyint' },
    position: { enum: true, items: () => FormationPositionsPosition },
    x: { type: 'decimal', precision: 5, scale: 2 },
    y: { type: 'decimal', precision: 5, scale: 2 },
  },
});
