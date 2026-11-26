import type { CatalogueTranslations } from '../../../../shared/catalogue.js';
export type CatalogueTextSeed = Record<
  'players' | 'techniques' | 'equipment' | 'tactics' | 'passives',
  Record<string, CatalogueTranslations>
>;
export async function backfillCatalogueTranslations(
  execute: (sql: string, values?: unknown[]) => Promise<unknown>,
  seed: CatalogueTextSeed,
) {
  const targets = [
    {
      kind: 'players',
      table: 'player_variants',
      sql: "SELECT v.id,JSON_UNQUOTE(JSON_EXTRACT(s.payload,'$.gameCharacterId')) AS external_key FROM player_variants v LEFT JOIN source_records s ON s.id=v.source_record_id",
    },
    {
      kind: 'techniques',
      table: 'techniques',
      sql: 'SELECT id,game_id AS external_key FROM techniques',
    },
    {
      kind: 'equipment',
      table: 'catalogue_items',
      sql: "SELECT id,string_id AS external_key FROM catalogue_items WHERE section='equipment'",
    },
    {
      kind: 'tactics',
      table: 'catalogue_items',
      sql: "SELECT id,string_id AS external_key FROM catalogue_items WHERE section='tactics'",
    },
    {
      kind: 'passives',
      table: 'catalogue_passives',
      sql: 'SELECT id,string_id AS external_key FROM catalogue_passives',
    },
  ] as const;
  const counts: Record<string, number> = {};
  for (const target of targets) {
    const rows = (await execute(target.sql)) as { id: number; external_key: string | null }[];
    const updates = rows.flatMap((row) =>
      row.external_key && Object.hasOwn(seed[target.kind], row.external_key)
        ? [{ id: row.id, texts: JSON.stringify(seed[target.kind][row.external_key]) }]
        : [],
    );
    counts[target.kind] = updates.length;
    for (let start = 0; start < updates.length; start += 100) {
      const batch = updates.slice(start, start + 100);
      await execute(
        `UPDATE ${target.table} SET translations=CASE id ${batch.map(() => 'WHEN ? THEN ?').join(' ')} ELSE translations END WHERE id IN (${batch.map(() => '?').join(',')})`,
        [...batch.flatMap((row) => [row.id, row.texts]), ...batch.map((row) => row.id)],
      );
    }
  }
  return counts;
}
