import { useEffect, useId, useRef } from 'react';
import type { PlayerDetail, TechniqueDetail } from '@shared/catalogue';
import { useRequest } from '../../hooks/use-catalogue-request';
import { Icon } from '@/components/ui/icon/icon';
import { closeDetail, type View } from '@/app/navigation';
import { PlayerPanel } from '../player-details/player-details';
import { TechniquePanel } from '../technique-details/technique-details';
import styles from './detail-dialog.module.scss';

export function DetailDialog({
  view,
  id,
  selectedWork,
}: {
  view: View;
  id: number;
  selectedWork: string | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const player = useRequest<PlayerDetail>(view === 'players' ? `/api/players/${id}` : null);
  const technique = useRequest<TechniqueDetail>(
    view === 'techniques' ? `/api/techniques/${id}` : null,
  );
  const request = view === 'players' ? player : technique;
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
    if (request.data) document.title = `${request.data.name} · KizunaDex`;
  }, [request.data]);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={title}
      onCancel={(event) => {
        event.preventDefault();
        closeDetail(view);
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          closeDetail(view);
      }}
    >
      <div className={styles.topbar}>
        <span>
          <Icon name={view === 'players' ? 'shirt' : 'bolt'} size={16} />
          {view === 'players' ? 'Fiche joueur' : 'Fiche technique'}
        </span>
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
            <span className={styles.spinner} />
            <h2 id={title}>Chargement de la fiche…</h2>
          </div>
        ) : request.error ? (
          <div className={styles.state} role="alert">
            <Icon name="info" size={32} />
            <h2 id={title}>Fiche indisponible</h2>
            <p>{request.error.message}</p>
            <button className={styles.primaryButton} onClick={request.retry}>
              Réessayer
            </button>
          </div>
        ) : (
          <>
            {player.data && (
              <PlayerPanel player={player.data} titleId={title} selectedWork={selectedWork} />
            )}
            {technique.data && (
              <TechniquePanel
                technique={technique.data}
                titleId={title}
                selectedWork={selectedWork}
              />
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
