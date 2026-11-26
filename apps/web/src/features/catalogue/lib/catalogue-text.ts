import type { CatalogueLanguage, CatalogueTranslations } from '@shared/catalogue';
import { getPreferences } from '../../preferences/preferences-store';
interface TextEntry {
  name?: string;
  description?: string | null;
  translations?: CatalogueTranslations;
  names?: Partial<Record<CatalogueLanguage, string>>;
}
function readable(value: string | null | undefined) {
  return value?.replace(/\\+n/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
}
export function catalogueName(entry: TextEntry, language = getPreferences().language): string {
  return readable(entry.names?.[language] ?? entry.translations?.[language]?.name ?? entry.name);
}
export function catalogueDescription(
  entry: TextEntry,
  language = getPreferences().language,
): string | null {
  return readable(entry.translations?.[language]?.description ?? entry.description) || null;
}
