import { createPool as createMysqlPool, type Pool } from 'mysql2/promise';

export interface Database {
  check(): Promise<void>;
  close(): Promise<void>;
}

export function createPool(connectionString: string): Pool {
  return createMysqlPool({
    uri: connectionString,
    connectionLimit: 5,
    maxIdle: 5,
    idleTimeout: 10_000,
    connectTimeout: 5_000,
    waitForConnections: true,
    queueLimit: 20,
    charset: 'utf8mb4',
    // Repositories finish transactions explicitly. An async reset can race pool.end().
    resetOnRelease: false,
    multipleStatements: false,
  });
}

export function createDatabase(connectionString: string): Database {
  const pool = createPool(connectionString);
  return {
    async check() { await pool.execute({ sql: 'SELECT 1', timeout: 5_000 }); },
    async close() { await pool.end(); },
  };
}
