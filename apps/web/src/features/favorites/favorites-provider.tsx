import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { FavoritesState } from '@shared/favorites';
import { useAuth } from '@/features/auth/auth-context';
import { useNotifications } from '@/features/notifications/notification-context';
import { FavoritesContext } from './favorites-context';
import { createFavoritesApi } from './lib/api';

const empty: FavoritesState = { playlists: [], entries: [] };
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <FavoriteSession key={user?.id ?? 'guest'} userId={user?.id ?? null}>
      {children}
    </FavoriteSession>
  );
}
function FavoriteSession({ userId, children }: { userId: number | null; children: ReactNode }) {
  const { notify } = useNotifications();
  const api = useMemo(() => (userId === null ? null : createFavoritesApi(userId)), [userId]);
  const [state, setState] = useState<FavoritesState>(empty);
  const [loading, setLoading] = useState(!!api);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const read = useRef<AbortController | null>(null);
  const write = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (!api || write.current) return;
    read.current?.abort();
    const controller = new AbortController();
    read.current = controller;
    setLoading(true);
    try {
      const next = await api.state(controller.signal);
      if (!controller.signal.aborted) {
        setState(next);
        setError(null);
      }
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : 'Les favoris sont indisponibles.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [api]);
  useEffect(() => {
    void refresh();
    const focus = () => {
      void refresh();
    };
    window.addEventListener('focus', focus);
    return () => {
      read.current?.abort();
      write.current?.abort();
      window.removeEventListener('focus', focus);
    };
  }, [refresh]);
  const mutate = async (
    action: (
      api: ReturnType<typeof createFavoritesApi>,
      signal: AbortSignal,
    ) => Promise<FavoritesState>,
  ) => {
    if (!api || write.current) return null;
    read.current?.abort();
    const controller = new AbortController();
    write.current = controller;
    setBusy(true);
    try {
      const next = await action(api, controller.signal);
      if (controller.signal.aborted) return null;
      setState(next);
      setError(null);
      return next;
    } catch (cause) {
      if (!controller.signal.aborted)
        notify({
          message: cause instanceof Error ? cause.message : 'Impossible de modifier les favoris.',
          tone: 'error',
        });
      return null;
    } finally {
      if (!controller.signal.aborted) {
        write.current = null;
        setBusy(false);
        setLoading(false);
      }
    }
  };
  return (
    <FavoritesContext
      value={{
        state,
        loading,
        busy,
        error,
        api,
        refresh,
        create: (name) => mutate((api, signal) => api.create(name, signal)),
        remove: (id) => mutate((api, signal) => api.remove(id, signal)),
        set: (id, kind, targetId, selected) =>
          mutate((api, signal) => api.set(id, kind, targetId, selected, signal)),
      }}
    >
      {children}
    </FavoritesContext>
  );
}
