import type { Pool, RowDataPacket } from 'mysql2/promise';
import type {
  HistoricalTeam,
  HistoricalTeamDetail,
  HistoricalTeamQuery,
  Page,
  PlayerSummary,
  Work,
} from '../../../../shared/catalogue.js';

type Values = (string | number)[];
interface Membership {
  teamId: number;
  variantId: number;
  work: Work | null;
}
const approved = (a: string, s: string) =>
  `(${a}.source_record_id IS NULL OR ${s}.review_status='verified')`;
const realTeam = "h.name NOT IN ('Sub Character','Unaffiliated')";
const escape = (value: string) => `%${value.replace(/[!%_]/g, '!$&')}%`;
const memberFrom = `FROM appearance_teams m JOIN variant_appearances a ON a.id=m.appearance_id
 JOIN player_variants v ON v.id=a.variant_id JOIN works w ON w.id=a.work_id
 LEFT JOIN source_records ms ON ms.id=m.source_record_id
 LEFT JOIN source_records aps ON aps.id=a.source_record_id
 LEFT JOIN source_records vs ON vs.id=v.source_record_id`;
const memberApproved = `${approved('m', 'ms')} AND ${approved('a', 'aps')} AND ${approved('v', 'vs')}`;
export function createTeamRepository(
  pool: Pool,
  players: (ids: number[]) => Promise<PlayerSummary[]>,
) {
  async function rows(sql: string, values: Values = []) {
    const [result] = await pool.execute<RowDataPacket[]>({ sql, timeout: 10000 }, values);
    return result;
  }
  async function memberships(teams: RowDataPacket[]): Promise<Membership[]> {
    if (!teams.length) return [];
    const [known, official] = await Promise.all([
      rows(
        `SELECT m.historical_team_id AS team_id,a.variant_id,w.id AS work_id,w.code,w.name,w.kind ${memberFrom}
    WHERE m.historical_team_id IN (${teams.map(() => '?').join(',')}) AND ${memberApproved} ORDER BY w.sort_order,w.id`,
        teams.map((team) => team.id),
      ),
      rows(`SELECT v.id AS variant_id,JSON_EXTRACT(s.payload,'$.teams') AS teams FROM player_variants v
    JOIN source_records s ON s.id=v.source_record_id WHERE s.review_status='verified' AND JSON_TYPE(JSON_EXTRACT(s.payload,'$.teams'))='ARRAY'`),
    ]);
    const result: Membership[] = known.map((row) => ({
      teamId: row.team_id,
      variantId: row.variant_id,
      work: { id: row.work_id, code: row.code, name: row.name, kind: row.kind },
    }));
    const pairs = new Set(result.map((member) => `${member.teamId}:${member.variantId}`));
    const byName = new Map(teams.map((team) => [team.name, team.id as number]));
    for (const row of official) {
      const names: unknown = typeof row.teams === 'string' ? JSON.parse(row.teams) : row.teams;
      if (!Array.isArray(names)) continue;
      for (const name of names) {
        const teamId = byName.get(name);
        const pair = `${teamId}:${row.variant_id}`;
        if (teamId === undefined || pairs.has(pair)) continue;
        pairs.add(pair);
        result.push({ teamId, variantId: row.variant_id, work: null });
      }
    }
    return result;
  }
  function summaries(input: RowDataPacket[], members: Membership[]): HistoricalTeam[] {
    const grouped = new Map<number, Membership[]>();
    for (const member of members) {
      const group = grouped.get(member.teamId) ?? [];
      group.push(member);
      grouped.set(member.teamId, group);
    }
    return input.map((row) => {
      const group = grouped.get(row.id) ?? [];
      const works = new Map<number, Work>();
      for (const member of group) if (member.work) works.set(member.work.id, member.work);
      return {
        id: row.id,
        name: row.name,
        logoUrl: row.image_url ?? null,
        sourceUrl: row.source_url ?? null,
        playerCount: new Set(group.map((member) => member.variantId)).size,
        works: [...works.values()],
      };
    });
  }
  return {
    async teamCount() {
      const found = await rows(
        `SELECT COUNT(*) AS total FROM historical_teams h LEFT JOIN source_records hs ON hs.id=h.source_record_id WHERE ${approved('h', 'hs')} AND ${realTeam}`,
      );
      return Number(found[0]?.total ?? 0);
    },
    async teams(query: HistoricalTeamQuery): Promise<Page<HistoricalTeam>> {
      const where = [approved('h', 'hs'), realTeam];
      const values: Values = [];
      if (query.q?.trim()) {
        where.push(`h.name LIKE ? ESCAPE '!'`);
        values.push(escape(query.q.trim()));
      }
      if (query.work) {
        where.push(
          `EXISTS (SELECT 1 ${memberFrom} WHERE m.historical_team_id=h.id AND w.code=? AND ${memberApproved})`,
        );
        values.push(query.work);
      }
      const from = `FROM historical_teams h LEFT JOIN source_records hs ON hs.id=h.source_record_id WHERE ${where.join(' AND ')}`;
      const page = query.page ?? 1;
      const limit = query.limit ?? 24;
      const [found, count] = await Promise.all([
        rows(
          `SELECT h.id,h.name,b.image_url,b.source_url FROM historical_teams h LEFT JOIN source_records hs ON hs.id=h.source_record_id LEFT JOIN team_badges b ON b.historical_team_id=h.id WHERE ${where.join(' AND ')} ORDER BY h.name,h.id LIMIT ? OFFSET ?`,
          [...values, limit, (page - 1) * limit],
        ),
        rows(`SELECT COUNT(*) AS total ${from}`, values),
      ]);
      const total = Number(count[0]?.total ?? 0);
      return {
        items: summaries(found, await memberships(found)),
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    },
    async team(id: number): Promise<HistoricalTeamDetail | null> {
      const found = await rows(
        `SELECT h.id,h.name,b.image_url,b.source_url FROM historical_teams h LEFT JOIN source_records hs ON hs.id=h.source_record_id LEFT JOIN team_badges b ON b.historical_team_id=h.id WHERE h.id=? AND ${approved('h', 'hs')} AND ${realTeam}`,
        [id],
      );
      if (!found.length) return null;
      const roster = await memberships(found);
      const summary = summaries(found, roster)[0]!;
      const members = new Map(
        (await players([...new Set(roster.map((member) => member.variantId))])).map((player) => [
          player.id,
          player,
        ]),
      );
      const groups = new Map<number | null, { work: Work | null; players: PlayerSummary[] }>();
      for (const entry of roster) {
        const key = entry.work?.id ?? null;
        if (!groups.has(key)) groups.set(key, { work: entry.work, players: [] });
        const player = members.get(entry.variantId);
        const group = groups.get(key)!;
        if (player && !group.players.some((member) => member.id === player.id))
          group.players.push(player);
      }
      return {
        ...summary,
        rosters: [...groups.values()].map((group) => ({
          ...group,
          players: group.players.sort((a, b) => a.name.localeCompare(b.name, 'fr')),
        })),
      };
    },
  };
}
