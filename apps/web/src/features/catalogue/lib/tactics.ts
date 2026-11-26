import { t } from '../../preferences/lib/i18n';
import type { CatalogueItem, Page } from '@shared/catalogue';

let cached: { items: CatalogueItem[]; at: number } | null = null;
export async function loadTactics(signal?: AbortSignal): Promise<CatalogueItem[]> {
  if (cached && Date.now() - cached.at < 60_000) return cached.items;
  const page = async (index: number): Promise<Page<CatalogueItem>> => {
    const response = await fetch(`/api/tactics?limit=48&page=${index}`, {
      signal: signal ?? AbortSignal.timeout(15_000),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(t('Les tactiques sont momentanément indisponibles.'));
    return response.json();
  };
  const first = await page(1);
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, first.pages - 1) }, (_, index) => page(index + 2)),
  );
  const items = [...first.items, ...remaining.flatMap((result) => result.items)].filter(
    (item) => item.section === 'tactics',
  );
  cached = { items, at: Date.now() };
  return items;
}
