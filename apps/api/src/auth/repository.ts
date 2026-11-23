import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { AuthUser } from '../../../../shared/auth.js';
import type { DiscordProfile } from './discord.js';
import { SESSION_SECONDS, STATE_SECONDS } from './security.js';
export interface LoginState {
  verifier: string;
  returnTo: string;
}
export interface AuthRepository {
  createState(stateHash: string, browserHash: string, state: LoginState): Promise<void>;
  consumeState(stateHash: string, browserHash: string): Promise<LoginState | null>;
  signIn(profile: DiscordProfile, sessionHash: string, previousHash?: string): Promise<AuthUser>;
  session(sessionHash: string): Promise<AuthUser | null>;
  signOut(sessionHash: string): Promise<void>;
}
const user = (row: RowDataPacket): AuthUser => ({
  id: row.id,
  discordId: row.discord_id,
  displayName: row.display_name,
  avatarUrl: row.avatar_url ?? null,
});
export function createAuthRepository(pool: Pool): AuthRepository {
  return {
    async createState(stateHash, browserHash, state) {
      await pool.execute({
        sql: 'DELETE FROM auth_states WHERE expires_at<=UTC_TIMESTAMP(3) LIMIT 1000',
        timeout: 5000,
      });
      await pool.execute(
        {
          sql: 'INSERT INTO auth_states (state_hash,browser_hash,verifier,return_to,expires_at) VALUES (UNHEX(?),UNHEX(?),?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL ? SECOND))',
          timeout: 5000,
        },
        [stateHash, browserHash, state.verifier, state.returnTo, STATE_SECONDS],
      );
    },
    async consumeState(stateHash, browserHash) {
      const db = await pool.getConnection();
      try {
        await db.beginTransaction();
        const [rows] = await db.execute<RowDataPacket[]>(
          {
            sql: 'SELECT verifier,return_to FROM auth_states WHERE state_hash=UNHEX(?) AND browser_hash=UNHEX(?) AND expires_at>UTC_TIMESTAMP(3) FOR UPDATE',
            timeout: 5000,
          },
          [stateHash, browserHash],
        );
        if (rows[0])
          await db.execute(
            { sql: 'DELETE FROM auth_states WHERE state_hash=UNHEX(?)', timeout: 5000 },
            [stateHash],
          );
        await db.commit();
        return rows[0] ? { verifier: rows[0].verifier, returnTo: rows[0].return_to } : null;
      } catch (error) {
        await db.rollback();
        throw error;
      } finally {
        db.release();
      }
    },
    async signIn(profile, sessionHash, previousHash) {
      const db = await pool.getConnection();
      try {
        await db.beginTransaction();
        const [result] = await db.execute<ResultSetHeader>(
          {
            sql: 'INSERT INTO users (discord_id,display_name,avatar_url) VALUES (?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id),display_name=VALUES(display_name),avatar_url=VALUES(avatar_url)',
            timeout: 5000,
          },
          [profile.discordId, profile.displayName, profile.avatarUrl],
        );
        if (previousHash)
          await db.execute(
            { sql: 'DELETE FROM auth_sessions WHERE token_hash=UNHEX(?)', timeout: 5000 },
            [previousHash],
          );
        await db.execute({
          sql: 'DELETE FROM auth_sessions WHERE expires_at<=UTC_TIMESTAMP(3) LIMIT 1000',
          timeout: 5000,
        });
        await db.execute(
          {
            sql: 'INSERT INTO auth_sessions (token_hash,user_id,expires_at) VALUES (UNHEX(?),?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL ? SECOND))',
            timeout: 5000,
          },
          [sessionHash, result.insertId, SESSION_SECONDS],
        );
        const [rows] = await db.execute<RowDataPacket[]>(
          {
            sql: 'SELECT id,discord_id,display_name,avatar_url FROM users WHERE id=?',
            timeout: 5000,
          },
          [result.insertId],
        );
        await db.commit();
        return user(rows[0]!);
      } catch (error) {
        await db.rollback();
        throw error;
      } finally {
        db.release();
      }
    },
    async session(sessionHash) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        {
          sql: 'SELECT u.id,u.discord_id,u.display_name,u.avatar_url FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=UNHEX(?) AND s.expires_at>UTC_TIMESTAMP(3)',
          timeout: 5000,
        },
        [sessionHash],
      );
      return rows[0] ? user(rows[0]) : null;
    },
    async signOut(sessionHash) {
      await pool.execute(
        { sql: 'DELETE FROM auth_sessions WHERE token_hash=UNHEX(?)', timeout: 5000 },
        [sessionHash],
      );
    },
  };
}
