import { t } from '@/features/preferences/lib/i18n';
import { FavoriteButton } from '@/features/favorites/components/favorite-button/favorite-button';
import { favoriteKind } from '@/features/favorites/lib/kinds';
import { PassivePanel } from '../passive-details/passive-details';
import { TeamPanel } from '../team-details/team-details';
import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import type {
  PlayerDetail,
  TechniqueDetail,
  CatalogueItem,
  Passive,
  HistoricalTeamDetail,
} from '@shared/catalogue';
import { useRequest } from '../../hooks/use-catalogue-request';
import { Icon } from '@/components/ui/icon/icon';
import { closeDetail, teamPlayerHref, useLocation, type View } from '@/app/navigation';
import { PlayerPanel } from '../player-details/player-details';
import { ItemPanel } from '../item-details/item-details';
import { TechniquePanel } from '../technique-details/technique-details';
import styles from './detail-dialog.module.scss';

const DETAIL_LABELS: Record<View, string> = {
  profile: 'Profil',
  builder: 'Composition',
  players: 'Fiche joueur',
  techniques: 'Fiche technique',
  equipment: 'Fiche équipement',
  tactics: 'Fiche tactique',
  catalogue: 'Catalogue',
  passives: 'Fiche passif',
  teams: 'Fiche équipe',
};

export function DetailDialog({ view, id }: { view: View; id: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const playerTitle = useId();
  const closeButton = useRef<HTMLButtonElement>(null);
  const teamScroll = useRef(0);
  const previousPlayer = useRef<number | null>(null);
  const location = useLocation();
  const selectedKind = view === 'teams' && location.playerDetail ? 'players' : view;
  const rosterPlayer = view === 'teams' ? location.playerDetail : null;
  const player = useRequest<PlayerDetail>(
    view === 'players'
      ? `/api/players/${id}`
      : rosterPlayer
        ? `/api/players/${rosterPlayer}`
        : null,
  );
  const technique = useRequest<TechniqueDetail>(
    view === 'techniques' ? `/api/techniques/${id}` : null,
  );
  const item = useRequest<CatalogueItem>(
    view === 'equipment' || view === 'tactics' ? `/api/${view}/${id}` : null,
  );
  const passive = useRequest<Passive>(view === 'passives' ? `/api/passives/${id}` : null);
  const team = useRequest<HistoricalTeamDetail>(view === 'teams' ? `/api/teams/${id}` : null);
  const request =
    view === 'players'
      ? player
      : view === 'techniques'
        ? technique
        : view === 'passives'
          ? passive
          : view === 'teams'
            ? team
            : item;
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
  useLayoutEffect(() => {
    if (rosterPlayer || previousPlayer.current) {
      closeButton.current?.focus({ preventScroll: true });
      dialog.current!.scrollTop = rosterPlayer ? 0 : teamScroll.current;
    }
    previousPlayer.current = rosterPlayer;
  }, [rosterPlayer]);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={rosterPlayer ? playerTitle : title}
      onScroll={() => {
        if (!rosterPlayer) teamScroll.current = dialog.current!.scrollTop;
      }}
      onCancel={(event) => event.preventDefault()}
    >
      <div className={styles.topbar}>
        <span>{t(DETAIL_LABELS[rosterPlayer ? 'players' : view])}</span>
        <div className={styles.actions}>
          {favoriteKind(selectedKind) && (
            <FavoriteButton kind={selectedKind} targetId={rosterPlayer ?? id} />
          )}
          <button
            className={styles.close}
            ref={closeButton}
            type="button"
            onClick={() => closeDetail(view, rosterPlayer ? 'player' : 'detail')}
            aria-label={t('Fermer la fiche')}
            autoFocus
          >
            <Icon name="close" size={22} />
          </button>
        </div>
      </div>
      <div className={styles.body} hidden={!!rosterPlayer} aria-busy={request.loading}>
        {request.loading ? (
          <div className={styles.state}>
            <h2 id={title}>{t('Chargement de la fiche…')}</h2>
          </div>
        ) : request.error ? (
          <div className={styles.state} role="alert">
            <h2 id={title}>{t('Fiche indisponible')}</h2>
            <p>{request.error.message}</p>
            <button className={styles.primaryButton} onClick={request.retry}>
              {t('Réessayer')}
            </button>
          </div>
        ) : (
          <>
            {passive.data && <PassivePanel passive={passive.data} titleId={title} />}
            {team.data && <TeamPanel team={team.data} titleId={title} />}
            {view === 'players' && player.data && (
              <PlayerPanel player={player.data} titleId={title} />
            )}
            {item.data && <ItemPanel item={item.data} titleId={title} />}
            {technique.data && <TechniquePanel technique={technique.data} titleId={title} />}
          </>
        )}
      </div>
      {rosterPlayer && (
        <div className={styles.body} aria-busy={player.loading}>
          {player.loading ? (
            <div className={styles.state}>
              <h2 id={playerTitle}>{t('Chargement de la fiche…')}</h2>
            </div>
          ) : player.error ? (
            <div className={styles.state} role="alert">
              <h2 id={playerTitle}>{t('Fiche indisponible')}</h2>
              <p>{player.error.message}</p>
              <button className={styles.primaryButton} onClick={player.retry}>
                {t('Réessayer')}
              </button>
            </div>
          ) : (
            player.data && (
              <PlayerPanel
                key={rosterPlayer}
                player={player.data}
                titleId={playerTitle}
                playerLink={(playerId) => teamPlayerHref(id, playerId)}
              />
            )
          )}
        </div>
      )}
    </dialog>
  );
}
