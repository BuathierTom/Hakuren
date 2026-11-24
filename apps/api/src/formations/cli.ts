import { readFile } from 'node:fs/promises';
import { loadEnvironment, getConfig } from '../config.js';
import { createOrm } from '../db/orm.js';
import { migrate } from '../db/migrate.js';

loadEnvironment();
const { databaseUrl } = getConfig();
if (!databaseUrl) throw new Error('Configurer DATABASE_URL avant de charger les formations.');
const orm = await createOrm(databaseUrl);
try {
  await migrate(orm);
  const sql = await readFile(
    new URL('../../database/changes/005-formations.sql', import.meta.url),
    'utf8',
  );
  await orm.em.fork().transactional(async (em) => {
    for (const statement of sql
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part && !['START TRANSACTION', 'COMMIT'].includes(part))) {
      await em.execute(statement);
    }
  });
  console.log('Les 8 formations Victory Road sont enregistrées.');
} finally {
  await orm.close(true);
}
