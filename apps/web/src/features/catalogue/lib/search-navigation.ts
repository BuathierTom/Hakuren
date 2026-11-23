import { href, navigate, type View } from '../../../app/navigation';
export function deferCatalogueSearch(view: View, value: string) {
  const source = window.location.pathname + window.location.search;
  const timeout = window.setTimeout(() => {
    if (window.location.pathname + window.location.search !== source) return;
    navigate(href(view, { q: value.trim(), page: 1, detail: null, player: null }), {
      replace: true,
    });
  }, 300);
  return () => window.clearTimeout(timeout);
}
