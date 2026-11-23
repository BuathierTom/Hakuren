import type { PlayerSummary } from '@shared/catalogue';
import { href, intercept } from '@/app/navigation';
import { ElementBadge, PositionBadge, RarityBadge } from '../catalogue-badges/catalogue-badges';
import { Portrait } from '../player-portrait/player-portrait';
import { GenderIcon, PlayStyleIcon } from '../game-icon/game-icon';
import { ELEMENTS, GENDERS, PLAY_STYLES, POSITIONS, workLabel } from '../../lib/labels';
import styles from './player-list.module.scss';
export function PlayerList({
  players,
  rarity,
  playerLink,
}: {
  players: PlayerSummary[];
  rarity: string | null;
  playerLink?: (id: number) => string;
}) {
  return (
    <div className={styles.table}>
      <div className={styles.heading} aria-hidden="true">
        <span className={styles.playerHeading}>Joueur</span>
        <span className={styles.gender}>Sexe</span>
        <span className={styles.position}>Poste</span>
        <span className={styles.element}>Élément</span>
        <span className={styles.style}>Style</span>
      </div>
      <ul className={styles.list}>
        {players.map((player) => {
          const target = playerLink?.(player.id) ?? href('players', { detail: player.id });
          const origin = player.origin
            ? workLabel(player.origin.code).replace(/^IE(\d)$/, 'IE $1')
            : 'Origine non renseignée';
          const team = player.teams?.length ? player.teams.join(' / ') : 'Équipe non renseignée';
          const attributes = [
            player.gender ? GENDERS[player.gender] : null,
            player.position ? POSITIONS[player.position] : null,
            player.element ? ELEMENTS[player.element] : null,
            player.playStyle ? PLAY_STYLES[player.playStyle] : null,
          ]
            .filter(Boolean)
            .join(', ');
          return (
            <li key={player.id}>
              <a
                className={styles.row}
                href={target}
                onClick={(event) => intercept(event, target, { overlay: true })}
                aria-label={`${player.name}, n° ${player.number ?? '—'}. ${attributes}. Voir la fiche`}
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
                    {team} - {origin}
                  </small>
                </span>
                <span className={styles.attributes}>
                  <span
                    className={styles.gender}
                    title={player.gender ? GENDERS[player.gender] : 'Sexe non renseigné'}
                  >
                    {player.gender === 'male' || player.gender === 'female' ? (
                      <GenderIcon gender={player.gender} />
                    ) : player.gender ? (
                      GENDERS[player.gender]
                    ) : (
                      '—'
                    )}
                  </span>
                  <span className={styles.position}>
                    <PositionBadge position={player.position} />
                  </span>
                  <span className={styles.element}>
                    <ElementBadge element={player.element} compact />
                  </span>
                  <span
                    className={styles.style}
                    title={player.playStyle ? PLAY_STYLES[player.playStyle] : 'Style non renseigné'}
                  >
                    {player.playStyle ? <PlayStyleIcon style={player.playStyle} /> : '—'}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
