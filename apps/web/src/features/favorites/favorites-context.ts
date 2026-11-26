import { createContext, useContext } from 'react';
import type { FavoritesState, FavoriteKind } from '@shared/favorites';
import type { createFavoritesApi } from './lib/api';
export interface FavoritesContextValue {
  state: FavoritesState;
  loading: boolean;
  busy: boolean;
  error: string | null;
  api: ReturnType<typeof createFavoritesApi> | null;
  refresh: () => Promise<void>;
  create: (name: string) => Promise<FavoritesState | null>;
  remove: (id: string) => Promise<FavoritesState | null>;
  set: (
    id: string,
    kind: FavoriteKind,
    targetId: number,
    selected: boolean,
  ) => Promise<FavoritesState | null>;
}
export const FavoritesContext = createContext<FavoritesContextValue | null>(null);
export function useFavorites() {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error('Contexte des favoris manquant.');
  return value;
}
