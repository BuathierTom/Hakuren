import { fileURLToPath } from 'node:url';
import { MikroORM, type Options } from '@mikro-orm/mysql';
import { Migrator } from '@mikro-orm/migrations';
import { entities } from './entities.js';

export function ormOptions(connectionString: string): Options {
  return {
    clientUrl: connectionString,
    entities,
    extensions: [Migrator],
    baseDir: fileURLToPath(new URL('../../', import.meta.url)),
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    forceUtcTimezone: true,
    pool: { min: 0, max: 5, idleTimeoutMillis: 10_000 },
    driverOptions: {
      connectTimeout: 5_000,
      waitForConnections: true,
      queueLimit: 20,
      resetOnRelease: false,
      multipleStatements: false,
    },
    migrations: {
      path: fileURLToPath(new URL('../../dist/db/migrations/', import.meta.url)),
      pathTs: fileURLToPath(new URL('./migrations/', import.meta.url)),
      glob: 'migration-*.{js,ts}',
      fileName: (timestamp, name) =>
        `migration-${timestamp}${name ? '-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : ''}`,
      snapshotName: '.snapshot-hakuren',
      snapshotOnMigrate: false,
      transactional: false,
      allOrNothing: false,
    },
  };
}

export function createOrm(connectionString: string): Promise<MikroORM> {
  return MikroORM.init(ormOptions(connectionString));
}
