import type { CatalogueItem } from '@shared/catalogue';
import { TacticIcon } from '../game-icon/game-icon';
import { EntryStatistics } from '../entry-statistics/entry-statistics';
import { EQUIPMENT_SLOTS, STAT_NAMES, tensionLabel } from '../../lib/labels';
import styles from './item-details.module.scss';
export function ItemPanel({ item, titleId }: { item: CatalogueItem; titleId: string }) {
  return (
    <>
      <div className={styles.hero}>
        {item.section === 'tactics' ? (
          <TacticIcon stringId={item.stringId} />
        ) : item.imageUrl ? (
          <img src={item.imageUrl} alt="" width="80" height="80" />
        ) : null}
        <div>
          <span>{item.slot ? EQUIPMENT_SLOTS[item.slot] : 'Tactique'}</span>
          <h2 id={titleId}>{item.name}</h2>
        </div>
      </div>
      {item.description && <p className={styles.description}>{item.description}</p>}
      <EntryStatistics
        fields={[
          { label: 'ID', value: item.gameId },
          ...(item.tension != null
            ? [{ label: 'Tension', value: `${tensionLabel(item.tension)}` }]
            : []),
        ]}
      />
      {Object.keys(item.stats).length > 0 && (
        <section className={styles.section}>
          <h3>Bonus de statistiques</h3>
          <dl className={styles.stats}>
            {Object.entries(item.stats).map(([stat, value]) => (
              <div key={stat}>
                <dt>{STAT_NAMES[stat as keyof typeof STAT_NAMES]}</dt>
                <dd>+{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </>
  );
}
