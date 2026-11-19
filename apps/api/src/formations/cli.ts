import { readFile } from 'node:fs/promises';
import { loadEnvironment, getConfig } from '../config.js';
import { createPool } from '../db/client.js';
loadEnvironment();
const { databaseUrl } = getConfig();
if (!databaseUrl) throw new Error('Configurer DATABASE_URL avant de charger les formations.');
const pool = createPool(databaseUrl);
const connection = await pool.getConnection();
try {
  const sql = await readFile(
    new URL('../../database/changes/005-formations.sql', import.meta.url),
    'utf8',
  );
  for (const statement of sql
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean))
    await connection.query(statement);
  console.log('Les 8 formations Victory Road sont enregistrées.');
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
  await pool.end();
}
