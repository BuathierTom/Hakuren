import { catalogueName } from '@/features/catalogue/lib/catalogue-text';
import { t } from '@/features/preferences/lib/i18n';
import { FavoriteButton } from '@/features/favorites/components/favorite-button/favorite-button';
import type { CatalogueItem } from '@shared/catalogue';
import { href, intercept } from '@/app/navigation';
import { TacticIcon } from '../game-icon/game-icon';
import { EQUIPMENT_SLOTS, STAT_NAMES, tensionLabel } from '../../lib/labels';
import styles from './item-list.module.scss';
export function ItemList({ items }: { items: CatalogueItem[] }) {
  return (
    <ul className={styles.list}>
      {items.map((item) => {
        const target = href(item.section, { detail: item.id });
        return (
          <li key={item.id} className={styles.entry}>
            <a href={target} onClick={(event) => intercept(event, target, { overlay: true })}>
              <span className={styles.icon}>
                {item.section === 'tactics' ? (
                  <TacticIcon stringId={item.stringId} />
                ) : item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    width="40"
                    height="40"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span aria-hidden="true">—</span>
                )}
              </span>
              <span className={styles.name}>
                <strong>{catalogueName(item)}</strong>
                <small>{item.slot ? t(EQUIPMENT_SLOTS[item.slot]) : t('Tactique')}</small>
              </span>
              <span className={styles.bonus}>
                {Object.entries(item.stats)
                  .map(
                    ([stat, value]) =>
                      `${t(STAT_NAMES[stat as keyof typeof STAT_NAMES])} +${value}`,
                  )
                  .join(' - ')}
              </span>
              {item.tension != null && (
                <span className={styles.tension}>{tensionLabel(item.tension)}</span>
              )}
            </a>
            <FavoriteButton kind={item.section} targetId={item.id} name={catalogueName(item)} />
          </li>
        );
      })}
    </ul>
  );
}
