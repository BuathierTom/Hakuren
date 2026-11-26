import { catalogueName } from '@/features/catalogue/lib/catalogue-text';
import { t } from '@/features/preferences/lib/i18n';
import { FavoriteButton } from '@/features/favorites/components/favorite-button/favorite-button';
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
        <span>{t('Élément')}</span>
        <span>{t('Puissance')}</span>
        <span>Tension</span>
        <span>{t('Notes')}</span>
      </div>
      <ul className={styles.list}>
        {techniques.map((technique) => {
          const target = href('techniques', { detail: technique.id });
          return (
            <li key={technique.id} className={styles.entry}>
              <a
                className={styles.row}
                href={target}
                onClick={(event) => intercept(event, target, { overlay: true })}
              >
                <span className={styles.identity}>
                  <TechniqueTypeIcon category={technique.category} />
                  <span>
                    <strong>{catalogueName(technique)}</strong>
                    {technique.category && <small>{t(CATEGORIES[technique.category])}</small>}
                  </span>
                </span>
                <span className={styles.element}>
                  <ElementBadge element={technique.element} compact />
                </span>
                <span
                  className={styles.power}
                  aria-label={
                    technique.power != null ? t('Puissance {0}', technique.power) : undefined
                  }
                >
                  {technique.power ?? '—'}
                </span>
                <span className={styles.tension}>
                  {technique.tension != null ? `${technique.tension} TP` : '—'}
                </span>
                <span className={styles.notes}>
                  {technique.notes?.map((note) => t(note)).join(' - ')}
                </span>
              </a>
              <FavoriteButton
                kind={'techniques'}
                targetId={technique.id}
                name={catalogueName(technique)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
