import { catalogueName } from '@/features/catalogue/lib/catalogue-text';
import { t } from '@/features/preferences/lib/i18n';
import { useEffect, useState } from 'react';
import type { Page } from '@shared/catalogue';
import type { FavoriteEntry, FavoriteKind } from '@shared/favorites';
import { catalogueDetailHref, intercept } from '@/app/navigation';
import { Select } from '@/components/ui/select/select';
import { Icon } from '@/components/ui/icon/icon';
import { CataloguePagination } from '@/features/catalogue/components/catalogue-pagination/catalogue-pagination';
import { Portrait } from '@/features/catalogue/components/player-portrait/player-portrait';
import { TeamLogo } from '@/features/catalogue/components/team-logo/team-logo';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog/confirmation-dialog';
import { useFavorites } from '../../favorites-context';
import { FAVORITE_KINDS } from '../../lib/kinds';
import { PlaylistCreate } from '../playlist-create/playlist-create';
import { FavoriteButton } from '../favorite-button/favorite-button';
import styles from './favorites-panel.module.scss';
export function FavoritesPanel() {
  const favorites = useFavorites();
  const [playlistId, setPlaylistId] = useState('');
  const playlist =
    favorites.state.playlists.find((p) => p.id === playlistId) ?? favorites.state.playlists[0];
  const [kind, setKind] = useState<FavoriteKind>('players');
  const [page, setPage] = useState(1);
  const [request, setRequest] = useState<{
    data: Page<FavoriteEntry> | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: true, error: null });
  const [retry, setRetry] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const id = playlist?.id;
  const entries = favorites.state.entries;
  const api = favorites.api;
  useEffect(() => {
    if (!api || !id) return;
    const controller = new AbortController();
    setRequest({ data: null, loading: true, error: null });
    void api
      .entries(id, kind, page, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        if (page > 1 && page > data.pages) {
          setPage(Math.max(1, data.pages));
          return;
        }
        setRequest({ data, loading: false, error: null });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setRequest({
            data: null,
            loading: false,
            error: cause instanceof Error ? cause.message : t('Les favoris sont indisponibles.'),
          });
      });
    return () => controller.abort();
  }, [api, id, kind, page, entries, retry]);
  return (
    <section className={styles.panel} aria-labelledby="favorites-title">
      <h2 id="favorites-title">{t('Liste de favoris')}</h2>
      {favorites.loading && !playlist ? (
        <p className={styles.state} role="status">
          {t('Chargement des favoris…')}
        </p>
      ) : favorites.error ? (
        <div className={styles.state} role="alert">
          <p>{favorites.error}</p>
          <button type="button" onClick={() => void favorites.refresh()}>
            {t('Réessayer')}
          </button>
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <Select
              label={t('Playlist de favoris')}
              value={playlist?.id ?? ''}
              options={favorites.state.playlists.map((p) => ({ value: p.id, label: p.name }))}
              onChange={(value) => {
                setPlaylistId(value);
                setPage(1);
              }}
            />
            {playlist && !playlist.isDefault && (
              <button
                className={styles.delete}
                type="button"
                title={t('Supprimer la playlist')}
                aria-label={t('Supprimer la playlist')}
                disabled={favorites.busy}
                onClick={() => setDeleting(true)}
              >
                <Icon name="trash" size={18} />
              </button>
            )}
            <PlaylistCreate
              onCreate={(id) => {
                setPlaylistId(id);
                setPage(1);
              }}
            />
          </div>
          <div className={styles.tabs} role="group" aria-label={t('Catégories de favoris')}>
            {(Object.entries(FAVORITE_KINDS) as [FavoriteKind, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                onClick={() => {
                  setKind(value);
                  setPage(1);
                }}
              >
                {t(label)}
                <span>{entries.filter((e) => e.playlistId === id && e.kind === value).length}</span>
              </button>
            ))}
          </div>
          <div className={styles.results} aria-busy={request.loading}>
            {request.loading ? (
              <p className={styles.state} role="status">
                {t('Chargement…')}
              </p>
            ) : request.error ? (
              <div className={styles.state} role="alert">
                <p>{request.error}</p>
                <button type="button" onClick={() => setRetry((value) => value + 1)}>
                  {t('Réessayer')}
                </button>
              </div>
            ) : !request.data?.items.length ? (
              <p className={styles.state}>
                {t(
                  'Aucun favori dans cette catégorie. Utilise le cœur dans le catalogue pour en ajouter.',
                )}
              </p>
            ) : (
              <>
                <div className={styles.pagination}>
                  <span>
                    {request.data.total} {t('favori')}
                    {request.data.total > 1 ? 's' : ''}
                  </span>
                  <CataloguePagination
                    page={page}
                    pages={request.data.pages}
                    label={t('Pages des favoris')}
                    onChange={setPage}
                  />
                </div>
                <ul>
                  {request.data.items.map((entry) => {
                    const target = catalogueDetailHref(entry.kind, entry.targetId, false);
                    return (
                      <li key={`${entry.kind}/${entry.targetId}`}>
                        {entry.available ? (
                          <a
                            href={target}
                            onClick={(event) => intercept(event, target, { overlay: true })}
                          >
                            {entry.kind === 'players' ? (
                              <Portrait src={entry.imageUrl} small />
                            ) : entry.kind === 'teams' ? (
                              <TeamLogo name={catalogueName(entry)} src={entry.imageUrl} />
                            ) : entry.imageUrl ? (
                              <img
                                src={entry.imageUrl}
                                alt=""
                                width="42"
                                height="42"
                                loading="lazy"
                              />
                            ) : (
                              <Icon
                                name={
                                  entry.kind === 'techniques'
                                    ? 'bolt'
                                    : entry.kind === 'equipment'
                                      ? 'shirt'
                                      : 'book'
                                }
                                size={25}
                              />
                            )}
                            <span>{catalogueName(entry)}</span>
                          </a>
                        ) : (
                          <span className={styles.unavailable}>{catalogueName(entry)}</span>
                        )}
                        <FavoriteButton
                          kind={entry.kind}
                          targetId={entry.targetId}
                          name={catalogueName(entry)}
                        />
                        <button
                          className={styles.remove}
                          type="button"
                          title={t('Retirer de cette playlist')}
                          aria-label={t('Retirer {0} de {1}', catalogueName(entry), playlist?.name)}
                          disabled={favorites.busy}
                          onClick={() => {
                            if (id) void favorites.set(id, entry.kind, entry.targetId, false);
                          }}
                        >
                          <Icon name="close" size={17} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </>
      )}
      {deleting && playlist && (
        <ConfirmationDialog
          title={t('Supprimer la playlist')}
          confirmLabel={t('Supprimer la playlist')}
          busy={favorites.busy}
          onClose={() => setDeleting(false)}
          onConfirm={() => {
            void favorites.remove(playlist.id).then((next) => {
              if (next) {
                setDeleting(false);
                setPlaylistId('');
                setPage(1);
              }
            });
          }}
        >
          <p>
            {t('Supprimer «')} {playlist.name}{' '}
            {t('» et les favoris qu’elle contient ? Les autres playlists seront conservées.')}
          </p>
        </ConfirmationDialog>
      )}
    </section>
  );
}
