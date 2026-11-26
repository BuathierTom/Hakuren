import { catalogueName, catalogueDescription } from '@/features/catalogue/lib/catalogue-text';
import { t } from '@/features/preferences/lib/i18n';
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
        <span className={styles.eyebrow}>
          {t('JOUEUR N°')} {player.number?.padStart(4, '0') ?? '—'}
        </span>
        <div className={styles.name}>
          <h2 id={titleId}>{catalogueName(player)}</h2>
          {specialForms.length > 0 && (
            <div className={styles.rarities} aria-label={t('Raretés disponibles')}>
              {specialForms.map((form) => (
                <RarityBadge key={form} name={t(PLAYER_FORMS[form])} />
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
              aria-label={t(GENDERS[player.gender])}
              title={t(GENDERS[player.gender])}
            >
              {player.gender === 'neutral' ? (
                t(GENDERS[player.gender])
              ) : (
                <GenderIcon gender={player.gender} />
              )}
            </span>
          )}
          {playStyle && (
            <span
              className={styles.attribute}
              role="img"
              aria-label={t(PLAY_STYLES[playStyle])}
              title={t(PLAY_STYLES[playStyle])}
            >
              <PlayStyleIcon style={playStyle} />
            </span>
          )}
        </div>
        <p className={styles.meta}>
          {age(player.ageGroup)} - {role(player.role)}
        </p>
      </div>
      {catalogueDescription(player) && (
        <p className={styles.description}>{catalogueDescription(player)}</p>
      )}
      <div className={styles.sidebar}>{aside}</div>
    </div>
  );
}
