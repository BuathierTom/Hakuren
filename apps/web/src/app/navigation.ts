import { useSyncExternalStore } from 'react';

export type View =
  | 'profile'
  | 'builder'
  | 'players'
  | 'techniques'
  | 'equipment'
  | 'tactics'
  | 'passives'
  | 'teams'
  | 'catalogue';
export const VIEW_PATHS: Record<View, string> = {
  profile: '/profil',
  builder: '/',
  players: '/joueurs',
  techniques: '/techniques',
  equipment: '/equipements',
  tactics: '/tactiques',
  passives: '/passifs',
  teams: '/equipes',
  catalogue: '/catalogue',
};
const subscribe = (callback: () => void) => {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
};
const snapshot = () => window.location.pathname + window.location.search;
export function useLocation() {
  const location = useSyncExternalStore(subscribe, snapshot);
  const url = new URL(location, window.location.origin);
  const view: View =
    (Object.entries(VIEW_PATHS).find(([, path]) => path === url.pathname)?.[0] as
      View | undefined) ?? 'players';
  const params = url.searchParams;
  const rawDetail = params.get('detail') ?? '';
  const rawPlayer = params.get('player') ?? '';
  return {
    view,
    params,
    detail: /^\d+$/.test(rawDetail) && Number(rawDetail) > 0 ? Number(rawDetail) : null,
    playerDetail: /^\d+$/.test(rawPlayer) && Number(rawPlayer) > 0 ? Number(rawPlayer) : null,
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
  return `${VIEW_PATHS[view]}${params.size ? `?${params}` : ''}`;
}
export function navigate(target: string, options: { replace?: boolean; overlay?: boolean } = {}) {
  const state = {
    overlay: options.overlay ?? (options.replace ? window.history.state?.overlay : false),
  };
  if (options.replace) window.history.replaceState(state, '', target);
  else window.history.pushState(state, '', target);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
export function catalogueDetailHref(
  view: Exclude<View, 'profile' | 'builder' | 'catalogue'>,
  id: number,
  preserve = true,
) {
  return window.location.pathname === VIEW_PATHS.profile
    ? href('profile', { entry: view, detail: id, player: null })
    : href(view, { detail: id }, preserve);
}
export function teamPlayerHref(teamId: number, playerId: number) {
  return window.location.pathname === VIEW_PATHS.profile
    ? href('profile', { entry: 'teams', detail: teamId, player: playerId })
    : href('teams', { detail: teamId, player: playerId });
}
export function closeDetail(view: View, key: 'detail' | 'player' = 'detail') {
  if (window.history.state?.overlay) window.history.back();
  else
    navigate(
      href(
        window.location.pathname === VIEW_PATHS.profile ? 'profile' : view,
        key === 'player' ? { player: null } : { detail: null, player: null, entry: null },
      ),
      { replace: true },
    );
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
