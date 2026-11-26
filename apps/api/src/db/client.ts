import { createFavoriteRepository, type FavoriteRepository } from '../favorites/repository.js';
import { favoriteCatalogue } from '../favorites/catalogue.js';
import { createTeamRepository, type TeamRepository } from '../teams/repository.js';
import { createAuthRepository, type AuthRepository } from '../auth/repository.js';
import { createPool as createMysqlPool, type Pool } from 'mysql2/promise';
import { createCatalogueRepository, type CatalogueRepository } from '../catalogue/repository.js';

import { createOrm } from './orm.js';

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

export async function createDatabase(connectionString: string): Promise<
  Database & {
    catalogue: CatalogueRepository;
    formations: FormationRepository;
    auth: AuthRepository;
    teams: TeamRepository;
    favorites: FavoriteRepository;
  }
> {
  const orm = await createOrm(connectionString);
  const pool = (await orm.em.getConnection().getNativeClient()).promise();
  return {
    auth: createAuthRepository(orm.em),
    favorites: createFavoriteRepository(orm.em, favoriteCatalogue(pool)),
    teams: createTeamRepository(orm.em),
    catalogue: createCatalogueRepository(pool),
    formations: createFormationRepository(orm.em),
    async check() {
      await pool.execute({ sql: 'SELECT 1', timeout: 5_000 });
    },
    async close() {
      await orm.close(true);
    },
  };
}
