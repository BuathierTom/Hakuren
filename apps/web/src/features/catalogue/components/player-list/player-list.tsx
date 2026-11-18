import type { PlayerSummary } from '@shared/catalogue';
import { href, intercept } from '@/app/navigation';
import { ElementBadge, PositionBadge, RarityBadge } from '../catalogue-badges/catalogue-badges';
import { Portrait } from '../player-portrait/player-portrait';
import { age, GENDERS, PLAY_STYLES, workLabel } from '../../lib/labels';
import styles from './player-list.module.scss';
export function PlayerList({
  players,
  rarity,
}: {
  players: PlayerSummary[];
  rarity: string | null;
}) {
  return (
    <div className={styles.table}>
      <div className={styles.heading} aria-hidden="true">
        <span className={styles.playerHeading}>Joueur</span>
        <span className={styles.gender}>Sexe</span>
        <span className={styles.position}>Poste</span>
        <span className={styles.element}>Élément</span>
        <span className={styles.style}>Style</span>
        <span className={styles.origin}>Origine</span>
      </div>
      <ul className={styles.list}>
        {players.map((player) => {
          const target = href('players', { detail: player.id });
          const origin = player.origin ? workLabel(player.origin.code) : '—';
          return (
            <li key={player.id}>
              <a
                className={styles.row}
                href={target}
                onClick={(event) => intercept(event, target, { overlay: true })}
                aria-label={`${player.name}, n° ${player.number ?? '—'}. Voir la fiche`}
              >
                <Portrait src={player.portraitUrl} small />
                <span className={styles.identity}>
                  <span className={styles.name}>
                    <strong>{player.name}</strong>
                    {rarity &&
                      player.rarities
                        .filter((entry) => entry.code === rarity)
                        .map((entry) => <RarityBadge key={entry.code} name={entry.name} />)}
                  </span>
                  <small>
                    N° {player.number?.padStart(4, '0') ?? '—'} ·{' '}
                    {player.formLabel ?? age(player.ageGroup)}
                  </small>
                  <small className={styles.mobileMeta}>
                    {player.playStyle ? `${PLAY_STYLES[player.playStyle]} · ` : ''}
                    {origin}
                  </small>
                </span>
                <span className={styles.gender}>
                  {player.gender ? GENDERS[player.gender] : '—'}
                </span>
                <span className={styles.position}>
                  <PositionBadge position={player.position} />
                </span>
                <span className={styles.element}>
                  <ElementBadge element={player.element} compact />
                </span>
                <span className={styles.style}>
                  {player.playStyle ? PLAY_STYLES[player.playStyle] : '—'}
                </span>
                <span className={styles.origin}>{origin}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
