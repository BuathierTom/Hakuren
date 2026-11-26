import { catalogueDescription } from '@/features/catalogue/lib/catalogue-text';
import { locale, t } from '@/features/preferences/lib/i18n';
import type { Passive } from '@shared/catalogue';
import { PassiveIcon, PlayStyleIcon } from '../game-icon/game-icon';
import { EntryStatistics } from '../entry-statistics/entry-statistics';
import { PASSIVE_SOURCES, PLAY_STYLES } from '../../lib/labels';
import styles from './passive-details.module.scss';
export function PassivePanel({ passive, titleId }: { passive: Passive; titleId: string }) {
  return (
    <>
      <div className={styles.heading}>
        <PassiveIcon icon={passive.icon} />
        <h2 id={titleId}>{t('Passif')}</h2>
      </div>
      <p className={styles.description}>{catalogueDescription(passive)}</p>
      <EntryStatistics
        fields={[
          { label: 'ID', value: passive.gameId },
          { label: t('Type'), value: t(PASSIVE_SOURCES[passive.source]) },
          {
            label: t('Valeur'),
            value: `${passive.value.toLocaleString(locale(), { maximumFractionDigits: 4 })}${passive.unit === 'percent' ? ' %' : ''}`,
          },
        ]}
      />
      {passive.playStyle && (
        <p className={styles.style}>
          <PlayStyleIcon style={passive.playStyle} />
          {t(PLAY_STYLES[passive.playStyle])}
        </p>
      )}
    </>
  );
}
