import type { ReactNode } from 'react';
import type { PlayerDetail, PlayStyle } from '@shared/catalogue';
import { ElementBadge, PositionBadge, RarityBadge } from '../catalogue-badges/catalogue-badges';
import { GenderIcon, PlayStyleIcon } from '../game-icon/game-icon';
import { Portrait } from '../player-portrait/player-portrait';
import { age, role, GENDERS, PLAY_STYLES } from '../../lib/labels';
import { PLAYER_FORMS, playerForms } from '../../lib/player-forms';
import styles from './player-details.module.scss';
export function PlayerProfileHeader({
  player,
  titleId,
  aside,
  playStyle = player.playStyle,
}: {
  player: PlayerDetail;
  titleId: string;
  aside: ReactNode;
  playStyle?: PlayStyle | null;
}) {
  const specialForms = playerForms(player).filter((form) => form !== 'common');
  return (
    <div className={styles.hero}>
      <div className={styles.portrait}>
        <Portrait src={player.portraitUrl} />
      </div>
      <div className={styles.identity}>
        <span className={styles.eyebrow}>JOUEUR N° {player.number?.padStart(4, '0') ?? '—'}</span>
        <div className={styles.name}>
          <h2 id={titleId}>{player.name}</h2>
          {specialForms.length > 0 && (
            <div className={styles.rarities} aria-label="Raretés disponibles">
              {specialForms.map((form) => (
                <RarityBadge key={form} name={PLAYER_FORMS[form]} />
              ))}
            </div>
          )}
        </div>
        <div className={styles.attributes}>
          <PositionBadge position={player.position} />
          <ElementBadge element={player.element} />
          {player.gender && (
            <span
              className={styles.attribute}
              role="img"
              aria-label={GENDERS[player.gender]}
              title={GENDERS[player.gender]}
            >
              {player.gender === 'neutral' ? (
                GENDERS[player.gender]
              ) : (
                <GenderIcon gender={player.gender} />
              )}
            </span>
          )}
          {playStyle && (
            <span
              className={styles.attribute}
              role="img"
              aria-label={PLAY_STYLES[playStyle]}
              title={PLAY_STYLES[playStyle]}
            >
              <PlayStyleIcon style={playStyle} />
            </span>
          )}
        </div>
        <p className={styles.meta}>
          {age(player.ageGroup)} - {role(player.role)}
        </p>
      </div>
      {player.description && <p className={styles.description}>{player.description}</p>}
      <div className={styles.sidebar}>{aside}</div>
    </div>
  );
}
