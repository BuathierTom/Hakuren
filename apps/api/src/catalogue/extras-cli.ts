import { loadEnvironment, getConfig } from '../config.js';
import { createOrm } from '../db/orm.js';
import { migrate } from '../db/migrate.js';
import { collectSources } from './sources.js';
import { importExtras, prepareExtras } from './extras.js';

loadEnvironment();
const { databaseUrl } = getConfig();
if (!databaseUrl) throw new Error('Configurer DATABASE_URL avant l’import.');
const args = new Set(process.argv.slice(2));
for (const arg of args)
  if (!['--offline', '--dry-run'].includes(arg)) throw new Error(`Option inconnue : ${arg}`);
const extras = prepareExtras(
  await collectSources({ offline: args.has('--offline'), log: console.log }),
);
console.log(`${extras.passives.length} passifs et ${extras.badges.length} écussons préparés.`);
if (!args.has('--dry-run')) {
  const orm = await createOrm(databaseUrl);
  try {
    await migrate(orm);
    const pool = (await orm.em.getConnection().getNativeClient()).promise();
    const db = await pool.getConnection();
    let locked = false;
    try {
      const [locks] = await db.query<import('mysql2').RowDataPacket[]>(
        "SELECT GET_LOCK('hakuren:catalogue-import',30) AS acquired",
      );
      if (Number(locks[0]?.acquired) !== 1) throw new Error('Un import est déjà en cours.');
      locked = true;
      await db.beginTransaction();
      await importExtras(db, extras);
      await db.commit();
      console.log('Passifs et écussons importés.');
    } catch {
      await db.rollback();
      console.error(
        'L’import a échoué. Vérifier la disponibilité de MySQL et relancer la commande.',
      );
      process.exitCode = 1;
    } finally {
      try {
        if (locked) await db.query("SELECT RELEASE_LOCK('hakuren:catalogue-import')");
      } finally {
        db.release();
      }
    }
  } finally {
    await orm.close(true);
  }
}
