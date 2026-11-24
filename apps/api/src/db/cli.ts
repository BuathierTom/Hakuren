import { getConfig, loadEnvironment } from '../config.js';
import { createOrm } from './orm.js';
import { migrate } from './migrate.js';

loadEnvironment();
const [action = 'up', name, ...extra] = process.argv.slice(2);
if (
  !['up', 'create', 'status'].includes(action) ||
  extra.length ||
  (action !== 'create' && name) ||
  (name && !/^[a-z0-9][a-z0-9_-]*$/.test(name))
) {
  throw new Error('Commande attendue : up, status ou create [nom-en-minuscules].');
}
const { databaseUrl } = getConfig();
if (!databaseUrl) throw new Error('Configurer DATABASE_URL avant de gérer les migrations.');
const orm = await createOrm(databaseUrl);
try {
  if (action === 'up') {
    const applied = await migrate(orm);
    console.log(
      applied.length ? `${applied.length} migration(s) appliquée(s).` : 'La base est à jour.',
    );
  } else if (action === 'create') {
    const migration = await orm.migrator.create(undefined, false, false, name);
    console.log(
      migration.diff.up.length
        ? `Migration créée : ${migration.fileName}`
        : 'Aucun changement de modèle à migrer.',
    );
  } else {
    const executed = await orm.migrator.getExecuted();
    const pending = await orm.migrator.getPending();
    console.table([
      ...executed.map((migration) => ({ migration: migration.name, statut: 'Appliquée' })),
      ...pending.map((migration) => ({ migration: migration.name, statut: 'En attente' })),
    ]);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'La commande de migration a échoué.');
  process.exitCode = 1;
} finally {
  await orm.close(true);
}
