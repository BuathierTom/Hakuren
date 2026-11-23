import { readFile } from 'node:fs/promises';
import { loadEnvironment, getConfig } from '../config.js';
import { createPool } from '../db/client.js';
loadEnvironment();
const { databaseUrl } = getConfig();
if (!databaseUrl) throw new Error('Configurer DATABASE_URL avant de préparer les comptes.');
const pool = createPool(databaseUrl);
try {
  const sql = await readFile(
    new URL('../../database/changes/007-discord-auth.sql', import.meta.url),
    'utf8',
  );
  for (const statement of sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean))
    await pool.query(statement);
  console.log('Les tables de connexion Discord sont prêtes.');
} catch {
  console.error('Impossible de préparer les comptes. Vérifier la base MySQL configurée.');
  process.exitCode = 1;
} finally {
  await pool.end();
}
