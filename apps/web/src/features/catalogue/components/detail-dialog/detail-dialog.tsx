import { useEffect, useId, useRef } from 'react';
import type { PlayerDetail, TechniqueDetail, CatalogueItem } from '@shared/catalogue';
import { useRequest } from '../../hooks/use-catalogue-request';
import { Icon } from '@/components/ui/icon/icon';
import { closeDetail, type View } from '@/app/navigation';
import { PlayerPanel } from '../player-details/player-details';
import { ItemPanel } from '../item-details/item-details';
import { TechniquePanel } from '../technique-details/technique-details';
import styles from './detail-dialog.module.scss';

const DETAIL_LABELS: Record<View, string> = {
  players: 'Fiche joueur',
  techniques: 'Fiche technique',
  equipment: 'Fiche équipement',
  tactics: 'Fiche tactique',
  catalogue: 'Catalogue',
};

export function DetailDialog({ view, id }: { view: View; id: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const player = useRequest<PlayerDetail>(view === 'players' ? `/api/players/${id}` : null);
  const technique = useRequest<TechniqueDetail>(
    view === 'techniques' ? `/api/techniques/${id}` : null,
  );
  const item = useRequest<CatalogueItem>(
    view === 'equipment' || view === 'tactics' ? `/api/${view}/${id}` : null,
  );
  const request = view === 'players' ? player : view === 'techniques' ? technique : item;
  useEffect(() => {
    const node = dialog.current!;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node.showModal();
    return () => {
      node.close();
      document.body.style.overflow = previous;
    };
  }, []);
  useEffect(() => {
    if (request.data) document.title = `${request.data.name} - Hakuren`;
  }, [request.data]);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={title}
      onCancel={(event) => event.preventDefault()}
    >
      <div className={styles.topbar}>
        <span>{DETAIL_LABELS[view]}</span>
        <button
          type="button"
          onClick={() => closeDetail(view)}
          aria-label="Fermer la fiche"
          autoFocus
        >
          <Icon name="close" size={22} />
        </button>
      </div>
      <div className={styles.body} aria-busy={request.loading}>
        {request.loading ? (
          <div className={styles.state}>
            <h2 id={title}>Chargement de la fiche…</h2>
          </div>
        ) : request.error ? (
          <div className={styles.state} role="alert">
            <h2 id={title}>Fiche indisponible</h2>
            <p>{request.error.message}</p>
            <button className={styles.primaryButton} onClick={request.retry}>
              Réessayer
            </button>
          </div>
        ) : (
          <>
            {player.data && <PlayerPanel player={player.data} titleId={title} />}
            {item.data && <ItemPanel item={item.data} titleId={title} />}
            {technique.data && <TechniquePanel technique={technique.data} titleId={title} />}
          </>
        )}
      </div>
    </dialog>
  );
}
