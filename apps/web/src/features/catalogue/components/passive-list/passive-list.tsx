import type { Passive } from '@shared/catalogue';
import { href, intercept } from '@/app/navigation';
import { PassiveIcon, PlayStyleIcon } from '../game-icon/game-icon';
import { PASSIVE_SOURCES, PLAY_STYLES } from '../../lib/labels';
import styles from './passive-list.module.scss';
export function PassiveList({ passives }: { passives: Passive[] }) {
  return (
    <ul className={styles.list}>
      {passives.map((passive) => {
        const target = href('passives', { detail: passive.id });
        return (
          <li key={passive.id}>
            <a href={target} onClick={(event) => intercept(event, target, { overlay: true })}>
              <span className={styles.icon}>
                <PassiveIcon icon={passive.icon} />
              </span>
              <span className={styles.name}>
                <strong>{passive.description}</strong>
                <small>
                  {PASSIVE_SOURCES[passive.source]}
                  {passive.playStyle ? ` - ${PLAY_STYLES[passive.playStyle]}` : ''}
                </small>
              </span>
              {passive.playStyle && (
                <span title={PLAY_STYLES[passive.playStyle]}>
                  <PlayStyleIcon style={passive.playStyle} />
                </span>
              )}
              <span className={styles.value}>
                {passive.value.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}
                {passive.unit === 'percent' ? ' %' : ''}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
