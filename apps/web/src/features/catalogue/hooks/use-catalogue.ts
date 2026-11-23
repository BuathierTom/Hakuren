import { deferCatalogueSearch } from '../lib/search-navigation';
import { useEffect, useRef, useState } from 'react';
import type {
  Page,
  PlayerSummary,
  TechniqueSummary,
  CatalogueItem,
  Passive,
  HistoricalTeam,
} from '@shared/catalogue';
import { PLAYER_FORMS } from '../lib/player-forms';
import { useRequest } from './use-catalogue-request';
import { href, navigate, useLocation } from '@/app/navigation';
import {
  CATEGORIES,
  ELEMENTS,
  label,
  POSITIONS,
  workLabel,
  EQUIPMENT_SLOTS,
  GENDERS,
  PLAY_STYLES,
  PLAYER_TYPES,
  PASSIVE_SOURCES,
} from '../lib/labels';
const FILTER_KEYS = [
  'q',
  'work',
  'position',
  'gender',
  'style',
  'element',
  'rarity',
  'role',
  'category',
  'technique',
  'slot',
  'source',
] as const;

export function useCatalogue() {
  const location = useLocation();
  const { view, params, detail } = location;
  const isPlayers = view === 'players';
  const q = params.get('q') ?? '';
  const [search, setSearch] = useState(q);
  const resultsRef = useRef<HTMLElement>(null);
  const pageListRef = useRef<HTMLDivElement>(null);
  const [pageHeight, setPageHeight] = useState<{ key: string; height: number } | null>(null);
  const query = new URLSearchParams();
  const allowed = isPlayers
    ? ['q', 'work', 'position', 'gender', 'style', 'element', 'rarity', 'role', 'page', 'technique']
    : view === 'techniques'
      ? ['q', 'element', 'category', 'page']
      : view === 'passives'
        ? ['q', 'source', 'style', 'page']
        : view === 'teams'
          ? ['q', 'work', 'page']
          : ['q', 'slot', 'page'];
  for (const key of allowed) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  if (isPlayers) query.set('sort', 'name');
  const paginationQuery = new URLSearchParams(query);
  paginationQuery.delete('page');
  const paginationKey = `${view}?${paginationQuery}`;
  const players = useRequest<Page<PlayerSummary>>(isPlayers ? `/api/players?${query}` : null, true);
  const techniques = useRequest<Page<TechniqueSummary>>(
    view === 'techniques' ? `/api/techniques?${query}` : null,
    true,
  );
  const items = useRequest<Page<CatalogueItem>>(
    view === 'equipment' || view === 'tactics' ? `/api/${view}?${query}` : null,
    true,
  );
  const passives = useRequest<Page<Passive>>(
    view === 'passives' ? `/api/passives?${query}` : null,
    true,
  );
  const teams = useRequest<Page<HistoricalTeam>>(
    view === 'teams' ? `/api/teams?${query}` : null,
    true,
  );
  const request = isPlayers
    ? players
    : view === 'techniques'
      ? techniques
      : view === 'passives'
        ? passives
        : view === 'teams'
          ? teams
          : items;
  const data = request.data;
  const page = Number(params.get('page')) || 1;
  const active = FILTER_KEYS.filter((key) => params.get(key) && allowed.includes(key));

  function update(patch: Record<string, string | number | null>, replace = false) {
    navigate(href(view, { ...patch, detail: null, player: null, page: patch.page ?? 1 }), {
      replace,
    });
  }
  function reset() {
    update(Object.fromEntries(FILTER_KEYS.map((key) => [key, null])));
  }
  useEffect(() => setSearch(q), [q, view]);
  useEffect(() => {
    const resetHeight = () => setPageHeight(null);
    window.addEventListener('resize', resetHeight);
    return () => window.removeEventListener('resize', resetHeight);
  }, []);
  useEffect(() => {
    if (search === q || detail !== null) return;
    return deferCatalogueSearch(view, search);
  }, [search, q, view, detail]);
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
    if (request.loading || !data || value < 1 || value > data.pages) return;
    const height = pageListRef.current?.getBoundingClientRect().height;
    if (height) setPageHeight({ key: paginationKey, height: Math.ceil(height) });
    update({ page: value });
  }
  function chipLabel(key: (typeof FILTER_KEYS)[number]) {
    const value = params.get(key)!;
    if (key === 'q') return `« ${value} »`;
    if (key === 'work') return workLabel(value);
    if (key === 'element') return label(ELEMENTS, value);
    if (key === 'position') return label(POSITIONS, value);
    if (key === 'gender') return label(GENDERS, value);
    if (key === 'style') return label(PLAY_STYLES, value);
    if (key === 'rarity')
      return value === 'hero' || value === 'basara' ? PLAYER_FORMS[value] : value;
    if (key === 'source') return label(PASSIVE_SOURCES, value);
    if (key === 'role') return label(PLAYER_TYPES, value);
    if (key === 'slot') return label(EQUIPMENT_SLOTS, value);
    if (key === 'category') return label(CATEGORIES, value);
    return 'Technique sélectionnée';
  }

  return {
    view,
    params,
    detail,
    isPlayers,
    search,
    setSearch,
    resultsRef,
    pageListRef,
    minimumPageHeight: pageHeight?.key === paginationKey ? pageHeight.height : undefined,
    players,
    techniques,
    items,
    passives,
    teams,
    request,
    data,
    page,
    active,
    update,
    reset,
    changePage,
    chipLabel,
  };
}
