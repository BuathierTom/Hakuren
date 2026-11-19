import { useEffect, useState } from 'react';
import type { Page, PlayerSummary, PlayerDetail } from '@shared/catalogue';
import { CatalogueFilters } from '@/features/catalogue/components/catalogue-filters/catalogue-filters';
import { CatalogueToolbar } from '@/features/catalogue/components/catalogue-toolbar/catalogue-toolbar';
import { CataloguePagination } from '@/features/catalogue/components/catalogue-pagination/catalogue-pagination';
import {
  ElementIcon,
  PositionIcon,
  GenderIcon,
  PlayStyleIcon,
} from '@/features/catalogue/components/game-icon/game-icon';
import { Portrait } from '@/features/catalogue/components/player-portrait/player-portrait';
import { useRequest } from '@/features/catalogue/hooks/use-catalogue-request';
import { TeamDialog } from '../team-dialog/team-dialog';
import { snapshotPlayer, type TeamPlayer } from '../../lib/team';
import styles from './player-picker.module.scss';
interface Props {
  slot: string;
  label: string;
  selectedIds: number[];
  onSelect: (player: TeamPlayer) => void;
  onClose: () => void;
}
export function PlayerPicker({ slot, label, selectedIds, onSelect, onClose }: Props) {
  const [params, setParams] = useState(new URLSearchParams());
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const eligibility =
    slot === 'coach' ? 'coach' : slot.startsWith('manager-') ? 'manager' : 'player';
  const update = (patch: Record<string, string | number | null>) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete('page');
      for (const [key, value] of Object.entries(patch))
        if (value === null || value === '') next.delete(key);
        else next.set(key, String(value));
      return next;
    });
  useEffect(() => {
    const timeout = window.setTimeout(
      () =>
        setParams((previous) => {
          if ((previous.get('q') ?? '') === search.trim()) return previous;
          const next = new URLSearchParams(previous);
          next.delete('page');
          if (search.trim()) next.set('q', search.trim());
          else next.delete('q');
          return next;
        }),
      250,
    );
    return () => window.clearTimeout(timeout);
  }, [search]);
  const query = new URLSearchParams(params);
  query.set('eligibility', eligibility);
  query.set('sort', 'name');
  query.set('limit', '18');
  const request = useRequest<Page<PlayerSummary>>(`/api/players?${query}`, true);
  const detail = useRequest<PlayerDetail>(selectedId ? `/api/players/${selectedId}` : null);
  useEffect(() => {
    if (detail.data && detail.data.id === selectedId) onSelect(snapshotPlayer(detail.data));
  }, [detail.data, selectedId, onSelect]);
  const filters = [...params.keys()].filter((key) => !['page', 'q'].includes(key)).length;
  return (
    <TeamDialog title={`Ajouter un personnage - ${label}`} onClose={onClose} wide>
      <CatalogueToolbar
        view="players"
        isPlayers
        search={search}
        work={params.get('work') ?? ''}
        onSearchChange={setSearch}
        onSearchClear={() => setSearch('')}
        onSearchSubmit={() => update({ q: search.trim() })}
        onWorkChange={(value) => update({ work: value })}
      />
      <CatalogueFilters
        view="players"
        params={params}
        activeCount={filters}
        update={update}
        reset={() => {
          setParams(new URLSearchParams());
          setSearch('');
        }}
      />
      {eligibility !== 'player' && (
        <p className={styles.hint}>
          {eligibility === 'coach'
            ? 'Entraîneurs disponibles pour le staff.'
            : 'Managers disponibles pour le staff.'}
        </p>
      )}
      <div className={styles.heading}>
        <p aria-live="polite">
          {request.data
            ? `${request.data.total.toLocaleString('fr-FR')} personnages`
            : 'Recherche en cours…'}
        </p>
        {request.data && (
          <CataloguePagination
            page={request.data.page}
            pages={request.data.pages}
            loading={request.loading || !!selectedId}
            label="Pages des personnages"
            onChange={(page) =>
              setParams((previous) => {
                const next = new URLSearchParams(previous);
                next.set('page', String(page));
                return next;
              })
            }
          />
        )}
      </div>
      {detail.error && (
        <div className={styles.error} role="alert">
          {detail.error.message}{' '}
          <button type="button" onClick={detail.retry}>
            Réessayer
          </button>
          <button type="button" onClick={() => setSelectedId(null)}>
            Revenir à la sélection
          </button>
        </div>
      )}
      {selectedId && detail.loading && <p role="status">Ajout du personnage…</p>}
      {request.error ? (
        <p role="alert">
          {request.error.message}{' '}
          <button type="button" onClick={request.retry}>
            Réessayer
          </button>
        </p>
      ) : (
        <div className={styles.results} aria-busy={request.loading || detail.loading}>
          {request.data?.items.map((player) => {
            const exists = selectedIds.includes(player.id);
            return (
              <button
                type="button"
                className={styles.player}
                key={player.id}
                disabled={exists || !!selectedId || request.loading}
                onClick={() => setSelectedId(player.id)}
                aria-label={`Ajouter ${player.name}${exists ? ' - déjà dans l’équipe' : ''}`}
              >
                <Portrait small src={player.portraitUrl} />
                <span className={styles.identity}>
                  <strong>{player.name}</strong>
                  <span>
                    {exists
                      ? 'Déjà dans l’équipe'
                      : [player.teams[0], player.origin?.name].filter(Boolean).join(' - ') ||
                        player.variantLabel ||
                        'Victory Road'}
                  </span>
                </span>
                <span className={styles.icons}>
                  <ElementIcon element={player.element} />
                  {player.position && <PositionIcon position={player.position} />}
                  {player.gender && <GenderIcon gender={player.gender} />}
                  {player.playStyle && <PlayStyleIcon style={player.playStyle} />}
                </span>
              </button>
            );
          })}
          {!request.loading && request.data?.total === 0 && (
            <p>Aucun personnage ne correspond aux filtres.</p>
          )}
          {request.loading && !request.data && <p>Chargement des personnages…</p>}
        </div>
      )}
    </TeamDialog>
  );
}
