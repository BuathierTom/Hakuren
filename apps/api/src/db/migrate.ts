import { createHash } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import type { MikroORM } from '@mikro-orm/mysql';

export async function migrate(orm: MikroORM): Promise<string[]> {
  const pool = (await orm.em.getConnection().getNativeClient()).promise();
  const connection = await pool.getConnection();
  const key =
    'hakuren:migrations:' +
    createHash('sha256').update(orm.config.get('dbName')).digest('hex').slice(0, 24);
  let locked = false;
  try {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?, 30) AS acquired', [
      key,
    ]);
    if (Number(rows[0]?.acquired) !== 1)
      throw new Error('Une migration est déjà en cours sur cette base.');
    locked = true;
    return (await orm.migrator.up()).map((migration) => migration.name);
  } finally {
    try {
      if (locked) await connection.query('SELECT RELEASE_LOCK(?)', [key]);
    } finally {
      connection.release();
    }
  }
}
