import { Pool } from 'pg';

export interface Database {
  check(): Promise<void>;
  close(): Promise<void>;
}

export function createPool(connectionString: string): Pool {
  const pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    statement_timeout: 10_000,
  });
  // An idle connection can fail outside a request. Consume the event without logging credentials.
  pool.on('error', () => console.error('Connexion PostgreSQL inactive interrompue.'));
  return pool;
}

export function createDatabase(connectionString: string): Database {
  const pool = createPool(connectionString);
  return {
    async check() { await pool.query('SELECT 1'); },
    async close() { await pool.end(); },
  };
}
