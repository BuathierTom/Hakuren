import { catalogueName } from '@/features/catalogue/lib/catalogue-text';
import { t } from '@/features/preferences/lib/i18n';
import { FavoriteButton } from '@/features/favorites/components/favorite-button/favorite-button';
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
        <span className={styles.playerHeading}>{t('Joueur')}</span>
        <span className={styles.gender}>{t('Sexe')}</span>
        <span className={styles.position}>{t('Poste')}</span>
        <span className={styles.element}>{t('Élément')}</span>
        <span className={styles.style}>{t('Style')}</span>
      </div>
      <ul className={styles.list}>
        {players.map((player) => {
          const target = playerLink?.(player.id) ?? href('players', { detail: player.id });
          const origin = player.origin
            ? workLabel(player.origin.code).replace(/^IE(\d)$/, 'IE $1')
            : t('Origine non renseignée');
          const team = player.teams?.length ? player.teams.join(' / ') : t('Équipe non renseignée');
          const attributes = [
            player.gender ? t(GENDERS[player.gender]) : null,
            player.position ? t(POSITIONS[player.position]) : null,
            player.element ? t(ELEMENTS[player.element]) : null,
            player.playStyle ? t(PLAY_STYLES[player.playStyle]) : null,
          ]
            .filter(Boolean)
            .join(', ');
          return (
            <li key={player.id} className={styles.entry}>
              <a
                className={styles.row}
                href={target}
                onClick={(event) => intercept(event, target, { overlay: true })}
                aria-label={t(
                  '{0}, n° {1}. {2}. Voir la fiche',
                  catalogueName(player),
                  player.number ?? '—',
                  attributes,
                )}
              >
                <Portrait src={player.portraitUrl} small />
                <span className={styles.identity}>
                  <span className={styles.name}>
                    <strong>{catalogueName(player)}</strong>
                    {rarity &&
                      player.rarities
                        .filter((entry) => entry.code === rarity)
                        .map((entry) => (
                          <RarityBadge key={entry.code} name={catalogueName(entry)} />
                        ))}
                  </span>
                  <small>
                    {team} - {origin}
                  </small>
                </span>
                <span className={styles.attributes}>
                  <span
                    className={styles.gender}
                    title={player.gender ? t(GENDERS[player.gender]) : t('Sexe non renseigné')}
                  >
                    {player.gender === 'male' || player.gender === 'female' ? (
                      <GenderIcon gender={player.gender} />
                    ) : player.gender ? (
                      t(GENDERS[player.gender])
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
                    title={
                      player.playStyle ? t(PLAY_STYLES[player.playStyle]) : t('Style non renseigné')
                    }
                  >
                    {player.playStyle ? <PlayStyleIcon style={player.playStyle} /> : '—'}
                  </span>
                </span>
              </a>
              <FavoriteButton kind="players" targetId={player.id} name={catalogueName(player)} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
