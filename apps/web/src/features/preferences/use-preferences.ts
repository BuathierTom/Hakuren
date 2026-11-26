import { useSyncExternalStore } from 'react';
import { getPreferences, setPreferences, subscribePreferences } from './preferences-store';
export function usePreferences() {
  const preferences = useSyncExternalStore(subscribePreferences, getPreferences);
  return { ...preferences, setPreferences };
}
