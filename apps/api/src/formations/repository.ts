import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { Formation } from '../../../../shared/formations.js';
export interface FormationRepository {
  list(): Promise<Formation[]>;
}
export function createFormationRepository(pool: Pool): FormationRepository {
  return {
    async list() {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT f.id, f.code, f.name, p.slot_number, p.position, p.x, p.y
         FROM formations f JOIN formation_positions p ON p.formation_id = f.id
         ORDER BY f.id, p.slot_number`,
      );
      const formations = new Map<number, Formation>();
      for (const row of rows) {
        const id = Number(row.id);
        if (!formations.has(id))
          formations.set(id, { id, code: row.code, name: row.name, positions: [] });
        formations.get(id)!.positions.push({
          slot: Number(row.slot_number),
          position: row.position,
          x: Number(row.x),
          y: Number(row.y),
        });
      }
      return [...formations.values()].filter((formation) => formation.positions.length === 11);
    },
  };
}
