import type { Page } from '@shared/catalogue';
import type { FavoriteEntry, FavoriteKind, FavoritesState } from '@shared/favorites';

export function createFavoritesApi(userId: number, request: typeof fetch = fetch) {
  async function send<T>(
    path: string,
    signal: AbortSignal,
    method = 'GET',
    body?: unknown,
  ): Promise<T> {
    const response = await request(`/api/me/${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-Hakuren-Account': String(userId),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(error?.message ?? 'Les favoris sont momentanément indisponibles.');
    }
    return response.json() as Promise<T>;
  }
  return {
    state: (signal: AbortSignal) => send<FavoritesState>('favorites', signal),
    create: (name: string, signal: AbortSignal) =>
      send<FavoritesState>('favorite-playlists', signal, 'POST', { name }),
    remove: (id: string, signal: AbortSignal) =>
      send<FavoritesState>(`favorite-playlists/${encodeURIComponent(id)}`, signal, 'DELETE'),
    set: (
      id: string,
      kind: FavoriteKind,
      targetId: number,
      selected: boolean,
      signal: AbortSignal,
    ) =>
      send<FavoritesState>(
        `favorite-playlists/${encodeURIComponent(id)}/entries/${kind}/${targetId}`,
        signal,
        selected ? 'PUT' : 'DELETE',
      ),
    entries: (id: string, kind: FavoriteKind, page: number, signal: AbortSignal) =>
      send<Page<FavoriteEntry>>(
        `favorite-playlists/${encodeURIComponent(id)}/entries?kind=${kind}&page=${page}`,
        signal,
      ),
  };
}
