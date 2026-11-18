import type { PlayerSummary } from '@shared/catalogue';
import { age, workLabel } from '../../lib/labels';
import { href, intercept } from '@/app/navigation';
import { ElementBadge, PositionBadge, RarityBadge } from '../catalogue-badges/catalogue-badges';
import { Icon } from '@/components/ui/icon/icon';
import { Portrait } from '../player-portrait/player-portrait';
import styles from './player-card.module.scss';

export function PlayerCard({
  player,
  list = false,
  rarity,
}: {
  player: PlayerSummary;
  list?: boolean;
  rarity?: string | null;
}) {
  const target = href('players', { detail: player.id });
  return (
    <a
      className={`${styles.player} ${list ? styles.listPlayer : ''}`}
      href={target}
      onClick={(event) => intercept(event, target, { overlay: true })}
      aria-label={`${player.name}, ${player.number ? `n° ${player.number}, ` : ''}${player.origin ? workLabel(player.origin.code) : ''}. Voir la fiche`}
    >
      <div className={styles.visual} data-element={player.element}>
        <div className={styles.cardTop}>
          <PositionBadge position={player.position} />
          <span className={styles.number}>N° {player.number?.padStart(4, '0') ?? '—'}</span>
          <ElementBadge element={player.element} compact />
        </div>
        <span className={styles.pitchCircle} />
        <div className={styles.portraitWrap}>
          <Portrait src={player.portraitUrl} list={list} />
        </div>
      </div>
      <div className={styles.playerContent}>
        <div className={styles.playerName}>
          <h3>{player.name}</h3>
          {rarity && player.rarities.some((entry) => entry.code === rarity) && (
            <span className={styles.rarities}>
              {player.rarities
                .filter((entry) => entry.code === rarity)
                .map((rarity) => (
                  <RarityBadge key={rarity.code} name={rarity.name} />
                ))}
            </span>
          )}
        </div>
        <p>{player.formLabel ?? age(player.ageGroup)}</p>
        <div className={styles.cardBottom}>
          <span className={styles.work}>
            {player.origin ? workLabel(player.origin.code) : 'Origine à confirmer'}
          </span>
          <span className={styles.cardArrow}>
            <Icon name="arrow" size={17} />
          </span>
        </div>
      </div>
    </a>
  );
}
