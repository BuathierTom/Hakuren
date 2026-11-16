import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfig, loadEnvironment } from '../config.js';
import { createPool } from './client.js';

loadEnvironment();
const config = getConfig();
if (!config.databaseUrl) {
  throw new Error('Renseigner DATABASE_URL dans le fichier .env avant de lancer les migrations.');
}

const directory = fileURLToPath(new URL('../../migrations/', import.meta.url));
const files = (await readdir(directory)).filter(name => /^\d+_[a-z0-9_-]+\.sql$/.test(name)).sort();
const pool = createPool(config.databaseUrl);
try {
  const client = await pool.connect();
  let locked = false;
  try {
    await client.query('SELECT pg_advisory_lock($1)', [73612542]);
    locked = true;
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const applied = await client.query<{ name: string; checksum: string }>('SELECT name, checksum FROM schema_migrations');
    const checksums = new Map(applied.rows.map(row => [row.name, row.checksum]));
    let count = 0;
    for (const name of files) {
      const sql = await readFile(resolve(directory, name), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      if (checksums.has(name)) {
        if (checksums.get(name) !== checksum) throw new Error(`Migration déjà appliquée modifiée : ${name}`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [name, checksum]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      count++;
      console.log(`Migration appliquée : ${name}`);
    }
    console.log(`${count} nouvelle(s) migration(s) appliquée(s).`);
  } finally {
    try {
      if (locked) await client.query('SELECT pg_advisory_unlock($1)', [73612542]);
    } finally {
      client.release();
    }
  }
} finally {
  await pool.end();
}
