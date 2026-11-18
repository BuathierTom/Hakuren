import { useEffect, useRef, useState } from 'react';
import type {
  CatalogueFilters as CatalogueMetadata,
  Page,
  PlayerSummary,
  TechniqueSummary,
  CatalogueItem,
} from '@shared/catalogue';
import { useRequest } from './use-catalogue-request';
import { href, navigate, useLocation } from '@/app/navigation';
import {
  CATEGORIES,
  ELEMENTS,
  label,
  POSITIONS,
  workLabel,
  VIEWS,
  EQUIPMENT_SLOTS,
} from '../lib/labels';
const FILTER_KEYS = [
  'q',
  'work',
  'position',
  'element',
  'rarity',
  'role',
  'category',
  'technique',
  'slot',
] as const;

export function useCatalogue() {
  const location = useLocation();
  const { view, params, detail } = location;
  const isPlayers = view === 'players';
  const list = !isPlayers || params.get('layout') === 'list';
  const q = params.get('q') ?? '';
  const [search, setSearch] = useState(q);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);
  const metadata = useRequest<CatalogueMetadata>('/api/catalogue');
  const query = new URLSearchParams();
  const allowed = isPlayers
    ? ['q', 'work', 'position', 'element', 'rarity', 'role', 'sort', 'page', 'technique']
    : view === 'techniques'
      ? ['q', 'element', 'category', 'page']
      : ['q', 'slot', 'page'];
  for (const key of allowed) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  const players = useRequest<Page<PlayerSummary>>(isPlayers ? `/api/players?${query}` : null);
  const techniques = useRequest<Page<TechniqueSummary>>(
    view === 'techniques' ? `/api/techniques?${query}` : null,
  );
  const items = useRequest<Page<CatalogueItem>>(
    view === 'equipment' || view === 'tactics' ? `/api/${view}?${query}` : null,
  );
  const request = isPlayers ? players : view === 'techniques' ? techniques : items;
  const data = request.data;
  const page = Number(params.get('page')) || 1;
  const active = FILTER_KEYS.filter((key) => params.get(key) && allowed.includes(key));

  function update(patch: Record<string, string | number | null>, replace = false) {
    navigate(href(view, { ...patch, detail: null, page: patch.page ?? 1 }), { replace });
  }
  function reset() {
    update(Object.fromEntries(FILTER_KEYS.map((key) => [key, null])));
  }
  useEffect(() => setSearch(q), [q, view]);
  useEffect(() => {
    if (search === q) return;
    const timeout = window.setTimeout(
      () => navigate(href(view, { q: search.trim(), page: 1, detail: null }), { replace: true }),
      300,
    );
    return () => window.clearTimeout(timeout);
  }, [search, q, view]);
  useEffect(() => {
    if (!detail) document.title = `${VIEWS[view]} · KizunaDex`;
  }, [view, detail]);
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.key !== '/' ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        document.querySelector('dialog[open]')
      )
        return;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('input,textarea,select'))
      )
        return;
      event.preventDefault();
      document.getElementById('catalogue-search')?.focus();
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);
  function changePage(value: number) {
    update({ page: value });
    resultsRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    });
  }
  function chipLabel(key: (typeof FILTER_KEYS)[number]) {
    const value = params.get(key)!;
    if (key === 'q') return `« ${value} »`;
    if (key === 'work') return workLabel(value);
    if (key === 'element') return label(ELEMENTS, value);
    if (key === 'position') return label(POSITIONS, value);
    if (key === 'rarity')
      return metadata.data?.rarities.find((r) => r.code === value)?.name ?? value;
    if (key === 'role') return value === 'player' ? 'Joueurs' : 'Encadrement';
    if (key === 'slot') return label(EQUIPMENT_SLOTS, value);
    if (key === 'category') return label(CATEGORIES, value);
    return 'Technique sélectionnée';
  }

  function setLayout(list: boolean) {
    navigate(href(view, { layout: list ? 'list' : null }));
  }
  return {
    view,
    params,
    detail,
    isPlayers,
    list,
    search,
    setSearch,
    filtersOpen,
    setFiltersOpen,
    resultsRef,
    metadata,
    players,
    techniques,
    items,
    request,
    data,
    page,
    active,
    update,
    reset,
    changePage,
    chipLabel,
    setLayout,
  };
}
