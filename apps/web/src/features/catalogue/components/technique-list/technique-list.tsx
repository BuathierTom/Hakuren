import type { TechniqueSummary } from '@shared/catalogue';
import { href, intercept } from '@/app/navigation';
import { ElementBadge } from '../catalogue-badges/catalogue-badges';
import { TechniqueTypeIcon } from '../game-icon/game-icon';
import { CATEGORIES } from '../../lib/labels';
import styles from './technique-list.module.scss';
export function TechniqueList({ techniques }: { techniques: TechniqueSummary[] }) {
  return (
    <div className={styles.table}>
      <div className={styles.heading} aria-hidden="true">
        <span>Technique</span>
        <span>Élément</span>
        <span>Puissance</span>
        <span>Tension</span>
        <span>Notes</span>
      </div>
      <ul className={styles.list}>
        {techniques.map((technique) => {
          const target = href('techniques', { detail: technique.id });
          return (
            <li key={technique.id}>
              <a
                className={styles.row}
                href={target}
                onClick={(event) => intercept(event, target, { overlay: true })}
              >
                <span className={styles.identity}>
                  <TechniqueTypeIcon category={technique.category} />
                  <span>
                    <strong>{technique.name}</strong>
                    {technique.category && <small>{CATEGORIES[technique.category]}</small>}
                  </span>
                </span>
                <span className={styles.element}>
                  <ElementBadge element={technique.element} compact />
                </span>
                <span
                  className={styles.power}
                  aria-label={technique.power != null ? `Puissance ${technique.power}` : undefined}
                >
                  {technique.power ?? '—'}
                </span>
                <span className={styles.tension}>
                  {technique.tension != null ? `${technique.tension} TP` : '—'}
                </span>
                <span className={styles.notes}>{technique.notes?.join(' · ')}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
