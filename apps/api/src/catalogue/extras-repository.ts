import { createTeamRepository } from './team-repository.js';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import type {
  Passive,
  PassiveQuery,
  PlayerSummary,
  CatalogueItem,
  LoadoutOptions,
  Page,
} from '../../../../shared/catalogue.js';

type Values = (string | number)[];
const approved = (a: string, s: string) =>
  `(${a}.source_record_id IS NULL OR ${s}.review_status='verified')`;
const escape = (value: string) => `%${value.replace(/[!%_]/g, '!$&')}%`;
const passive = (row: RowDataPacket): Passive => ({
  id: row.id,
  gameId: row.game_id,
  stringId: row.string_id,
  name: row.name,
  description: row.description,
  source: row.source,
  playStyle: row.play_style,
  value: Number(row.value),
  unit: row.unit,
  icon: row.icon,
  family: row.family,
  tier: row.tier,
  sourceUrl: row.source_url,
});
export function createExtrasRepository(
  pool: Pool,
  players: (ids: number[]) => Promise<PlayerSummary[]>,
  item: (row: RowDataPacket) => CatalogueItem,
) {
  async function rows(sql: string, values: Values = []) {
    const [result] = await pool.execute<RowDataPacket[]>({ sql, timeout: 10000 }, values);
    return result;
  }
  const teams = createTeamRepository(pool, players);
  return {
    ...teams,
    async extraCounts() {
      const [found, total] = await Promise.all([
        rows('SELECT COUNT(*) AS total FROM catalogue_passives WHERE is_published=1'),
        teams.teamCount(),
      ]);
      return { passives: Number(found[0]?.total ?? 0), teams: total };
    },
    async passives(query: PassiveQuery): Promise<Page<Passive>> {
      const where = ['is_published=1'];
      const values: Values = [];
      if (query.q?.trim()) {
        where.push(`(description LIKE ? ESCAPE '!' OR game_id=? OR string_id=?)`);
        values.push(escape(query.q.trim()), query.q.trim(), query.q.trim());
      }
      if (query.source) {
        where.push('source=?');
        values.push(query.source);
      }
      if (query.style) {
        where.push('play_style=?');
        values.push(query.style);
      }
      const from = `FROM catalogue_passives WHERE ${where.join(' AND ')}`;
      const page = query.page ?? 1;
      const limit = query.limit ?? 24;
      const [found, count] = await Promise.all([
        rows(`SELECT * ${from} ORDER BY description,id LIMIT ? OFFSET ?`, [
          ...values,
          limit,
          (page - 1) * limit,
        ]),
        rows(`SELECT COUNT(*) AS total ${from}`, values),
      ]);
      const total = Number(count[0]?.total ?? 0);
      return { items: found.map(passive), total, page, limit, pages: Math.ceil(total / limit) };
    },
    async passive(id: number): Promise<Passive | null> {
      const found = await rows('SELECT * FROM catalogue_passives WHERE id=? AND is_published=1', [
        id,
      ]);
      return found[0] ? passive(found[0]) : null;
    },
    async loadouts(): Promise<LoadoutOptions> {
      const [equipment, passives] = await Promise.all([
        rows(
          `SELECT i.*,s.source_url FROM catalogue_items i LEFT JOIN source_records s ON s.id=i.source_record_id WHERE i.section='equipment' AND i.is_published=1 AND ${approved('i', 's')} ORDER BY i.name,i.id`,
        ),
        rows(
          'SELECT * FROM catalogue_passives WHERE is_published=1 ORDER BY source,family,tier,id',
        ),
      ]);
      return { equipment: equipment.map(item), passives: passives.map(passive) };
    },
  };
}
