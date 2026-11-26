import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
  decodePreferences,
  readPreferences,
  resolvedTheme,
  type Preferences,
} from './lib/preferences';
let current: Preferences = { ...DEFAULT_PREFERENCES };
let initialized = false;
const listeners = new Set<() => void>();
export const getPreferences = () => current;
export const subscribePreferences = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
function apply() {
  const theme = resolvedTheme(
    current.theme,
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  document.documentElement.lang = current.language;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#14222e' : '#087b9c');
}
function publish(next: Preferences) {
  current = next;
  apply();
  for (const listener of listeners) listener();
}
export function setPreferences(update: Partial<Preferences>) {
  const next = decodePreferences({ ...current, ...update });
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
  } catch {}
  publish(next);
}
export function initializePreferences() {
  if (initialized) return;
  initialized = true;
  try {
    current = readPreferences(window.localStorage);
  } catch {
    current = { ...DEFAULT_PREFERENCES };
  }
  apply();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (current.theme === 'system') apply();
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== PREFERENCES_KEY && event.key !== null) return;
    try {
      publish(readPreferences(window.localStorage));
    } catch {
      publish({ ...DEFAULT_PREFERENCES });
    }
  });
}
