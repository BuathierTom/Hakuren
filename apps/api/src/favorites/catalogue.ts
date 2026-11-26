import { catalogueTranslations } from '../catalogue/localization.js';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { FavoriteEntry, FavoriteKind } from '../../../../shared/favorites.js';

export type FavoriteLookup = (kind: FavoriteKind, ids: number[]) => Promise<FavoriteEntry[]>;
export function favoriteCatalogue(pool: Pool): FavoriteLookup {
  return async (kind, ids) => {
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    const approved = "(v.source_record_id IS NULL OR s.review_status='verified')";
    const queries: Record<FavoriteKind, string> = {
      players: `SELECT v.id,v.name,v.translations,v.portrait_url AS image_url FROM player_variants v LEFT JOIN source_records s ON s.id=v.source_record_id WHERE v.id IN (${placeholders}) AND ${approved}`,
      techniques: `SELECT v.id,v.name,v.translations,NULL AS image_url FROM techniques v LEFT JOIN source_records s ON s.id=v.source_record_id WHERE v.id IN (${placeholders}) AND v.is_published=1 AND v.category IS NOT NULL AND v.category NOT IN ('passive','other','tactic') AND ${approved}`,
      equipment: `SELECT v.id,v.name,v.translations,v.image_url FROM catalogue_items v LEFT JOIN source_records s ON s.id=v.source_record_id WHERE v.id IN (${placeholders}) AND v.section='equipment' AND v.is_published=1 AND ${approved}`,
      tactics: `SELECT v.id,v.name,v.translations,v.image_url FROM catalogue_items v LEFT JOIN source_records s ON s.id=v.source_record_id WHERE v.id IN (${placeholders}) AND v.section='tactics' AND v.is_published=1 AND ${approved}`,
      teams: `SELECT v.id,v.name,b.image_url FROM historical_teams v LEFT JOIN source_records s ON s.id=v.source_record_id LEFT JOIN team_badges b ON b.historical_team_id=v.id WHERE v.id IN (${placeholders}) AND v.name NOT IN ('Sub Character','Unaffiliated') AND ${approved}`,
    };
    const [rows] = await pool.execute<RowDataPacket[]>({ sql: queries[kind], timeout: 10000 }, ids);
    return rows.map((row) => ({
      ...catalogueTranslations(row.translations),
      kind,
      targetId: row.id,
      name: row.name,
      imageUrl: row.image_url ?? null,
      available: true,
    }));
  };
}
