import { useId, useState } from 'react';
import type { FavoriteKind } from '@shared/favorites';
import { Icon } from '@/components/ui/icon/icon';
import { Popover } from '@/components/ui/popover/popover';
import { useAuth } from '@/features/auth/auth-context';
import { useFavorites } from '../../favorites-context';
import { PlaylistCreate } from '../playlist-create/playlist-create';
import styles from './favorite-button.module.scss';
export function FavoriteButton({
  kind,
  targetId,
  name,
}: {
  kind: FavoriteKind;
  targetId: number;
  name?: string;
}) {
  const id = useId();
  const auth = useAuth();
  const favorites = useFavorites();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const selected = favorites.state.entries.filter(
    (e) => e.kind === kind && e.targetId === targetId,
  );
  const label = `${selected.length ? 'Gérer les favoris' : 'Ajouter aux favoris'}${name ? ` : ${name}` : ''}`;
  const login = new URL(auth.loginUrl, window.location.origin);
  login.searchParams.set('returnTo', window.location.pathname + window.location.search);
  return (
    <div className={styles.root}>
      <button
        className={styles.trigger}
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={!!anchor}
        aria-controls={id}
        aria-haspopup="dialog"
        data-selected={!!selected.length}
        disabled={auth.loading}
        onClick={(event) => setAnchor(anchor ? null : event.currentTarget)}
      >
        <Icon name="heart" size={19} />
      </button>
      {anchor && (
        <Popover
          id={id}
          anchor={anchor}
          label="Choisir les playlists de favoris"
          placement="bottom"
          onClose={() => setAnchor(null)}
          className={styles.menu}
        >
          <div className={styles.content}>
            <h3>Ajouter à une playlist</h3>
            {!auth.user ? (
              <div className={styles.state}>
                <p>Connecte-toi pour enregistrer tes favoris.</p>
                {auth.configured && <a href={login.href}>Se connecter avec Discord</a>}
              </div>
            ) : favorites.loading ? (
              <p className={styles.state} role="status">
                Chargement…
              </p>
            ) : favorites.error ? (
              <div className={styles.state}>
                <p>{favorites.error}</p>
                <button type="button" onClick={() => void favorites.refresh()}>
                  Réessayer
                </button>
              </div>
            ) : (
              <>
                <div className={styles.playlists} role="group" aria-label="Playlists">
                  {favorites.state.playlists.map((playlist) => {
                    const checked = selected.some((e) => e.playlistId === playlist.id);
                    return (
                      <button
                        key={playlist.id}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        disabled={favorites.busy}
                        onClick={() => void favorites.set(playlist.id, kind, targetId, !checked)}
                      >
                        <span>{playlist.name}</span>
                        {checked && <Icon name="check" size={17} />}
                      </button>
                    );
                  })}
                </div>
                <PlaylistCreate />
              </>
            )}
          </div>
        </Popover>
      )}
    </div>
  );
}
