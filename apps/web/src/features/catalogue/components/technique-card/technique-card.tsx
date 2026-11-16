import type { TechniqueSummary } from '@shared/catalogue';
import { CATEGORIES } from '../../lib/labels';
import { href, intercept } from '@/app/navigation';
import { ElementBadge } from '../catalogue-badges/catalogue-badges';
import { Icon } from '@/components/ui/icon/icon';
import { TechniqueTypeIcon } from '../game-icon/game-icon';
import styles from './technique-card.module.scss';

export function TechniqueCard({
  technique,
  list = false,
}: {
  technique: TechniqueSummary;
  list?: boolean;
}) {
  const target = href('techniques', { detail: technique.id });
  return (
    <a
      className={`${styles.technique} ${list ? styles.listTechnique : ''}`}
      href={target}
      onClick={(event) => intercept(event, target, { overlay: true })}
    >
      <div className={styles.techniqueTop}>
        <span className={styles.techniqueIcon}>
          <TechniqueTypeIcon category={technique.category} />
        </span>
        <ElementBadge element={technique.element} compact />
      </div>
      <div className={styles.techniqueContent}>
        <span className={styles.category}>
          {technique.category ? CATEGORIES[technique.category] : 'Type à confirmer'}
        </span>
        <h3>{technique.name}</h3>
      </div>
      <div className={styles.techniqueBottom}>
        <span>Explorer la technique</span>
        <Icon name="arrow" size={17} />
      </div>
    </a>
  );
}
