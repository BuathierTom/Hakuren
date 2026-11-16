import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnvironment, getConfig } from '../config.js';
import { createPool } from '../db/client.js';
import { importCatalogue } from './import.js';
import { prepareCatalogue } from './prepare.js';
import { CACHE, collectSources, SNAPSHOT } from './sources.js';

async function main() {
  const args = new Set(process.argv.slice(2));
  const allowed = new Set(['--dry-run', '--offline', '--refresh', '--help']);
  for (const arg of args) if (!allowed.has(arg)) throw new Error(`Option inconnue : ${arg}`);
  if (args.has('--help')) {
    console.log('npm run import:catalogue -- [--dry-run] [--offline | --refresh]');
    console.log('--dry-run : préparer sans écrire dans MySQL.');
    console.log('--offline : utiliser uniquement le cache local vérifié.');
    console.log('--refresh : recollecter les sources publiques.');
    console.log('Sources et bilans locaux : work/catalogue/ (ignoré par Git).');
    return;
  }
  if (args.has('--offline') && args.has('--refresh'))
    throw new Error('--offline et --refresh sont incompatibles.');
  const resources = await collectSources({
    offline: args.has('--offline'),
    refresh: args.has('--refresh'),
    log: console.log,
  });
  const plan = prepareCatalogue(resources);
  const result = {
    preparedAt: new Date().toISOString(),
    snapshot: SNAPSHOT,
    mode: args.has('--dry-run') ? 'dry-run' : 'import',
    ...plan.summary,
    warnings: plan.warnings,
    sources: [...resources.values()].map(({ body, ...meta }) => meta),
  };
  console.log(JSON.stringify({ ...plan.summary, warnings: plan.warnings }, null, 2));
  if (!args.has('--dry-run')) {
    loadEnvironment();
    const { databaseUrl } = getConfig();
    if (!databaseUrl) throw new Error('Configurer DATABASE_URL avant l’import.');
    const pool = createPool(databaseUrl);
    try {
      await importCatalogue(pool, plan, console.log);
    } finally {
      await pool.end();
    }
    console.log('Catalogue importé.');
  }
  await mkdir(CACHE, { recursive: true });
  await writeFile(
    resolve(CACHE, args.has('--dry-run') ? 'last-preview.json' : 'last-import.json'),
    JSON.stringify(result, null, 2) + '\n',
  );
}

main().catch((error: unknown) => {
  const sql = typeof error === 'object' && error !== null && 'sql' in error;
  const message = sql
    ? 'Échec SQL pendant l’import. Vérifier le schéma et la disponibilité de la base ; la commande peut être relancée sans doublon.'
    : error instanceof Error
      ? error.message
      : 'Erreur inconnue.';
  console.error(message);
  process.exitCode = 1;
});
