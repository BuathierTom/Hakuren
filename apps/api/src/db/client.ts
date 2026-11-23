import { createTeamRepository, type TeamRepository } from '../teams/repository.js';
import { createAuthRepository, type AuthRepository } from '../auth/repository.js';
import { createPool as createMysqlPool, type Pool } from 'mysql2/promise';
import { createCatalogueRepository, type CatalogueRepository } from '../catalogue/repository.js';

import { createFormationRepository, type FormationRepository } from '../formations/repository.js';

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
    resetOnRelease: false,
    multipleStatements: false,
  });
}

export function createDatabase(connectionString: string): Database & {
  catalogue: CatalogueRepository;
  formations: FormationRepository;
  auth: AuthRepository;
  teams: TeamRepository;
} {
  const pool = createPool(connectionString);
  return {
    auth: createAuthRepository(pool),
    teams: createTeamRepository(pool),
    catalogue: createCatalogueRepository(pool),
    formations: createFormationRepository(pool),
    async check() {
      await pool.execute({ sql: 'SELECT 1', timeout: 5_000 });
    },
    async close() {
      await pool.end();
    },
  };
}
