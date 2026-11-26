import { buildApp } from './app.js';
import { getConfig, loadEnvironment } from './config.js';
import { createDatabase } from './db/client.js';

loadEnvironment();
const config = getConfig();
const database = config.databaseUrl ? await createDatabase(config.databaseUrl) : undefined;
const app = buildApp({
  database,
  catalogue: database?.catalogue,
  formations: database?.formations,
  teams: database?.teams,
  favorites: database?.favorites,
  auth: { config: config.auth, repository: database?.auth },
  logger: true,
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.close().catch(() => {
      process.exitCode = 1;
    });
  });
}

try {
  await app.listen({ host: config.host, port: config.port });
  if (!database) app.log.info('MySQL non configuré. Renseigner DATABASE_URL dans .env.');
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}
