import type { EntityManager } from '@mikro-orm/mysql';
import type { Formation } from '../../../../shared/formations.js';
import { FormationPosition } from '../db/entities/formation-position.js';

export interface FormationRepository {
  list(): Promise<Formation[]>;
}

export function createFormationRepository(manager: EntityManager): FormationRepository {
  return {
    async list() {
      const positions = await manager.fork().find(
        FormationPosition,
        {},
        {
          populate: ['formation'],
          orderBy: { formation: { id: 'asc' }, slotNumber: 'asc' },
        },
      );
      const formations = new Map<number, Formation>();
      for (const row of positions) {
        const formation = row.formation.$;
        if (!formations.has(formation.id))
          formations.set(formation.id, {
            id: formation.id,
            code: formation.code,
            name: formation.name,
            positions: [],
          });
        formations.get(formation.id)!.positions.push({
          slot: row.slotNumber,
          position: row.position,
          x: Number(row.x),
          y: Number(row.y),
        });
      }
      return [...formations.values()].filter((formation) => formation.positions.length === 11);
    },
  };
}
