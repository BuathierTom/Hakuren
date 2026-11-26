export type Language = 'fr' | 'en';
export type Theme = 'light' | 'dark' | 'system';
export interface Preferences {
  language: Language;
  theme: Theme;
}
export const PREFERENCES_KEY = 'hakuren.preferences.v1';
export const DEFAULT_PREFERENCES: Preferences = { language: 'fr', theme: 'system' };
export function decodePreferences(value: unknown): Preferences {
  const data = value && typeof value === 'object' ? (value as Partial<Preferences>) : {};
  return {
    language: data.language === 'en' ? 'en' : 'fr',
    theme: data.theme === 'light' || data.theme === 'dark' ? data.theme : 'system',
  };
}
export function readPreferences(storage: Pick<Storage, 'getItem'>): Preferences {
  try {
    return decodePreferences(JSON.parse(storage.getItem(PREFERENCES_KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}
export function resolvedTheme(theme: Theme, systemDark: boolean): 'light' | 'dark' {
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
}
