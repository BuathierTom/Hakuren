import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { Team, AccountTeam } from '../../../../shared/teams.js';
import { TeamError } from './errors.js';
export interface TeamRepository {
  list(userId: number): Promise<AccountTeam[]>;
  draft(userId: number): Promise<AccountTeam | null>;
  save(userId: number, team: Team, revision: number | null, draft?: boolean): Promise<AccountTeam>;
  remove(userId: number, id: string, revision: number): Promise<void>;
}
const decode = (row: RowDataPacket): AccountTeam => ({
  team: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
  revision: row.revision,
  updatedAt: row.updated_at,
});
const columns = "payload,revision,DATE_FORMAT(updated_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at";
export function createTeamRepository(pool: Pool): TeamRepository {
  async function transaction<T>(
    userId: number,
    action: (db: PoolConnection) => Promise<T>,
  ): Promise<T> {
    const db = await pool.getConnection();
    let reusable = true;
    try {
      await db.beginTransaction();
      const [owners] = await db.execute<RowDataPacket[]>(
        { sql: 'SELECT id FROM users WHERE id=? FOR UPDATE', timeout: 5000 },
        [userId],
      );
      if (!owners.length)
        throw new TeamError(401, 'LOGIN_REQUIRED', 'Reconnecte-toi pour retrouver tes équipes.');
      const result = await action(db);
      await db.commit();
      return result;
    } catch (error) {
      try {
        await db.rollback();
      } catch {
        reusable = false;
      }
      throw error;
    } finally {
      if (reusable) db.release();
      else db.destroy();
    }
  }
  return {
    async list(userId) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        {
          sql: `SELECT ${columns} FROM user_teams WHERE user_id=? ORDER BY updated_at DESC,team_id LIMIT 50`,
          timeout: 5000,
        },
        [userId],
      );
      return rows.map(decode);
    },
    async draft(userId) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        { sql: `SELECT ${columns} FROM user_team_drafts WHERE user_id=?`, timeout: 5000 },
        [userId],
      );
      return rows[0] ? decode(rows[0]) : null;
    },
    save(userId, team, revision, draft = false) {
      return transaction(userId, async (db) => {
        const table = draft ? 'user_team_drafts' : 'user_teams';
        const where = draft ? 'user_id=?' : 'user_id=? AND team_id=?';
        const keys = draft ? [userId] : [userId, team.id];
        const [existing] = await db.execute<RowDataPacket[]>(
          { sql: `SELECT revision FROM ${table} WHERE ${where} FOR UPDATE`, timeout: 5000 },
          keys,
        );
        if ((existing[0]?.revision ?? null) !== revision)
          throw new TeamError(
            409,
            'TEAM_CONFLICT',
            'Cette composition a été modifiée ailleurs. Recharge les données du compte avant de continuer.',
          );
        const [formation] = await db.execute<RowDataPacket[]>(
          { sql: 'SELECT id FROM formations WHERE code=?', timeout: 5000 },
          [team.formation],
        );
        if (!formation.length)
          throw new TeamError(400, 'INVALID_FORMATION', 'Cette formation est indisponible.');
        if (!existing.length && !draft) {
          const [count] = await db.execute<RowDataPacket[]>(
            { sql: 'SELECT COUNT(*) AS count FROM user_teams WHERE user_id=?', timeout: 5000 },
            [userId],
          );
          if (count[0]!.count >= 50)
            throw new TeamError(
              409,
              'TEAM_LIMIT',
              'Tu as atteint la limite de 50 équipes sur ton compte.',
            );
        }
        if (existing.length)
          await db.execute(
            {
              sql: `UPDATE ${table} SET payload=?,revision=revision+1,updated_at=UTC_TIMESTAMP(3) WHERE ${where}`,
              timeout: 5000,
            },
            [JSON.stringify(team), ...keys],
          );
        else
          await db.execute(
            {
              sql: `INSERT INTO ${table} (${draft ? 'user_id' : 'user_id,team_id'},payload,revision,updated_at) VALUES (${draft ? '?' : '?,?'},?,1,UTC_TIMESTAMP(3))`,
              timeout: 5000,
            },
            [...keys, JSON.stringify(team)],
          );
        const [rows] = await db.execute<RowDataPacket[]>(
          { sql: `SELECT ${columns} FROM ${table} WHERE ${where}`, timeout: 5000 },
          keys,
        );
        return decode(rows[0]!);
      });
    },
    remove(userId, id, revision) {
      return transaction(userId, async (db) => {
        const [rows] = await db.execute<RowDataPacket[]>(
          {
            sql: 'SELECT revision FROM user_teams WHERE user_id=? AND team_id=? FOR UPDATE',
            timeout: 5000,
          },
          [userId, id],
        );
        if (!rows[0]) throw new TeamError(404, 'TEAM_NOT_FOUND', 'Cette équipe est introuvable.');
        if (rows[0].revision !== revision)
          throw new TeamError(
            409,
            'TEAM_CONFLICT',
            'Cette équipe a été modifiée ailleurs. Recharge les données du compte avant de continuer.',
          );
        await db.execute(
          { sql: 'DELETE FROM user_teams WHERE user_id=? AND team_id=?', timeout: 5000 },
          [userId, id],
        );
      });
    },
  };
}
