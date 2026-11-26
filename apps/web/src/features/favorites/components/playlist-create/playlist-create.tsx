import { useState } from 'react';
import { useFavorites } from '../../favorites-context';
import styles from './playlist-create.module.scss';
export function PlaylistCreate({ onCreate }: { onCreate?: (id: string) => void }) {
  const favorites = useFavorites();
  const [name, setName] = useState('');
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim() || favorites.busy) return;
        const ids = new Set(favorites.state.playlists.map((p) => p.id));
        void favorites.create(name.trim()).then((next) => {
          if (!next) return;
          setName('');
          const created = next.playlists.find((p) => !ids.has(p.id));
          if (created) onCreate?.(created.id);
        });
      }}
    >
      <input
        aria-label="Nom de la nouvelle playlist"
        placeholder="Nouvelle playlist…"
        maxLength={80}
        value={name}
        onChange={(event) => setName(event.target.value)}
        disabled={favorites.busy}
      />
      <button type="submit" disabled={favorites.busy || !name.trim()}>
        Créer
      </button>
    </form>
  );
}
