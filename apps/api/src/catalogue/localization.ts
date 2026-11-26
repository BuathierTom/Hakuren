import type { CatalogueTranslations } from '../../../../shared/catalogue.js';
export function catalogueTranslations(value: unknown): { translations?: CatalogueTranslations } {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: CatalogueTranslations = {};
  for (const language of ['fr', 'en'] as const) {
    const text = (value as CatalogueTranslations)[language];
    if (!text || typeof text !== 'object') continue;
    result[language] = {
      name: typeof text.name === 'string' ? text.name : null,
      description: typeof text.description === 'string' ? text.description : null,
    };
  }
  return Object.keys(result).length ? { translations: result } : {};
}
