import { useEffect, useReducer, useState } from 'react';

const cache = new Map<string, { data: unknown; at: number }>();
export class ApiError extends Error {
  constructor(public status: number) {
    super(
      status === 404
        ? 'Cette fiche est introuvable.'
        : status === 400
          ? 'Les filtres de recherche sont invalides.'
          : 'Le catalogue est momentanément indisponible.',
    );
  }
}
interface State<T> {
  url: string | null;
  data: T | null;
  error: Error | null;
  loading: boolean;
}
export function useRequest<T>(url: string | null) {
  const [state, setState] = useState<State<T>>({ url, data: null, error: null, loading: !!url });
  const [version, retry] = useReducer((value) => value + 1, 0);
  useEffect(() => {
    if (!url) {
      setState({ url, data: null, error: null, loading: false });
      return;
    }
    const saved = cache.get(url);
    if (saved && Date.now() - saved.at < 60_000) {
      setState({ url, data: saved.data as T, error: null, loading: false });
      return;
    }
    const controller = new AbortController();
    setState({ url, data: null, error: null, loading: true });
    fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new ApiError(response.status);
        const data: T = await response.json();
        if (controller.signal.aborted) return;
        if (cache.size >= 30) cache.delete(cache.keys().next().value!);
        cache.set(url, { data, at: Date.now() });
        setState({ url, data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            url,
            data: null,
            error:
              error instanceof ApiError
                ? error
                : new Error('Le catalogue est momentanément indisponible.'),
            loading: false,
          });
      });
    return () => controller.abort();
  }, [url, version]);
  const current = state.url === url ? state : { url, data: null, error: null, loading: !!url };
  return {
    ...current,
    retry: () => {
      if (url) cache.delete(url);
      retry();
    },
  };
}
