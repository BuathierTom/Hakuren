import { useSyncExternalStore } from 'react';

export type View = 'players' | 'techniques';
const subscribe = (callback: () => void) => {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
};
const snapshot = () => window.location.pathname + window.location.search;
export function useLocation() {
  const location = useSyncExternalStore(subscribe, snapshot);
  const url = new URL(location, window.location.origin);
  const view: View = url.pathname === '/techniques' ? 'techniques' : 'players';
  const params = url.searchParams;
  const rawDetail = params.get('detail') ?? '';
  return {
    view,
    params,
    detail: /^\d+$/.test(rawDetail) && Number(rawDetail) > 0 ? Number(rawDetail) : null,
  };
}
export function href(
  view: View,
  patch: Record<string, string | number | null> = {},
  preserve = true,
) {
  const params = preserve ? new URLSearchParams(window.location.search) : new URLSearchParams();
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === '' || (key === 'page' && value === 1)) params.delete(key);
    else params.set(key, String(value));
  }
  return `/${view === 'players' ? 'joueurs' : 'techniques'}${params.size ? `?${params}` : ''}`;
}
export function navigate(target: string, options: { replace?: boolean; overlay?: boolean } = {}) {
  const state = {
    overlay: options.overlay ?? (options.replace ? window.history.state?.overlay : false),
  };
  if (options.replace) window.history.replaceState(state, '', target);
  else window.history.pushState(state, '', target);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
export function closeDetail(view: View) {
  if (window.history.state?.overlay) window.history.back();
  else navigate(href(view, { detail: null }), { replace: true });
}
export function intercept(
  event: React.MouseEvent<HTMLAnchorElement>,
  target: string,
  options?: Parameters<typeof navigate>[1],
) {
  if (event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  event.preventDefault();
  navigate(target, options);
}
