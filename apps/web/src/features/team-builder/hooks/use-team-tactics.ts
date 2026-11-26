import { useEffect, useReducer, useState } from 'react';
import type { CatalogueItem } from '@shared/catalogue';
import { loadTactics } from '@/features/catalogue/lib/tactics';

export function useTeamTactics() {
  const [state, setState] = useState<{ items: CatalogueItem[]; loading: boolean; error: boolean }>({
    items: [],
    loading: true,
    error: false,
  });
  const [version, retry] = useReducer((value) => value + 1, 0);
  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: false }));
    loadTactics(AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]))
      .then((items) => {
        if (!controller.signal.aborted) setState({ items, loading: false, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ items: [], loading: false, error: true });
      });
    return () => controller.abort();
  }, [version]);
  return { ...state, retry };
}
