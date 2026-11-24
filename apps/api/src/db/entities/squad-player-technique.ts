import { EntitySchema, PrimaryKeyProp, type Ref } from '@mikro-orm/core';
import { SquadPlayer } from './squad-player.js';
import { VariantLearnset } from './variant-learnset.js';

export class SquadPlayerTechnique {
  [PrimaryKeyProp]?: ['squadPlayerId', 'slotNumber'];
  squadPlayerId!: number;
  squadPlayer!: Ref<SquadPlayer>;
  slotNumber!: number;
  learnset!: Ref<VariantLearnset>;
}

export const SquadPlayerTechniqueSchema = new EntitySchema({
  class: SquadPlayerTechnique,
  tableName: 'squad_player_techniques',
  uniques: [
    {
      name: 'uq_squad_player_technique',
      expression:
        'alter table `squad_player_techniques` add unique `uq_squad_player_technique` (`squad_player_id`, `learnset_id`)',
    },
  ],
  checks: [{ name: 'ck_squad_technique_slot', expression: '`slot_number` > 0' }],
  properties: {
    squadPlayerId: { primary: true, type: 'integer', unsigned: true },
    squadPlayer: {
      kind: 'm:1',
      entity: () => SquadPlayer,
      ref: true,
      fieldNames: ['squad_player_id', 'variant_id'],
      referencedColumnNames: ['id', 'variant_id'],
      updateRule: 'restrict',
      deleteRule: 'cascade',
      foreignKeyName: 'fk_squad_technique_player',
      index: 'fk_squad_technique_player',
    },
    slotNumber: { primary: true, type: 'tinyint' },
    learnset: {
      kind: 'm:1',
      entity: () => VariantLearnset,
      ref: true,
      fieldNames: ['learnset_id', 'variant_id'],
      referencedColumnNames: ['id', 'variant_id'],
      updateRule: 'restrict',
      deleteRule: 'restrict',
      foreignKeyName: 'fk_squad_technique_learnset',
      index: 'fk_squad_technique_learnset',
    },
  },
});
