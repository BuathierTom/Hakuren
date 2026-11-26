import { catalogueName } from '@/features/catalogue/lib/catalogue-text';
import { locale, t } from '@/features/preferences/lib/i18n';
import { useId, useRef, useState } from 'react';
import type { CatalogueItem, StatKey } from '@shared/catalogue';
import { Popover } from '@/components/ui/popover/popover';
import { STAT_NAMES } from '@/features/catalogue/lib/labels';
import { EquipmentIcon } from './equipment-icon';
import styles from './equipment-preview.module.scss';

export function EquipmentPreview({ item, label }: { item?: CatalogueItem; label: string }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const bonuses = (Object.keys(STAT_NAMES) as StatKey[]).flatMap((stat) => {
    const value = item?.stats[stat];
    return typeof value === 'number' && Number.isFinite(value) && value !== 0
      ? [{ stat, value }]
      : [];
  });
  return (
    <>
      <button
        ref={trigger}
        className={styles.trigger}
        type="button"
        disabled={!item}
        aria-label={
          item
            ? t('Voir les bonus de {0}', catalogueName(item))
            : t('Aucun équipement - {0}', label)
        }
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={open ? id : undefined}
        title={item ? t('Voir les bonus de {0}', catalogueName(item)) : label}
        popoverTarget={id}
        onClick={(event) => {
          event.preventDefault();
          setOpen((current) => !current);
        }}
      >
        <EquipmentIcon src={item?.imageUrl ?? null} name={item ? catalogueName(item) : label} />
      </button>
      <Popover
        id={id}
        anchor={open ? trigger.current : null}
        label={t('Bonus de {0}', item ? catalogueName(item) : label)}
        role="tooltip"
        className={styles.preview}
        onClose={() => setOpen(false)}
      >
        {bonuses.length ? (
          <dl className={styles.stats}>
            {bonuses.map(({ stat, value }) => (
              <div key={stat}>
                <dt>{t(STAT_NAMES[stat])}</dt>
                <dd>{value.toLocaleString(locale(), { signDisplay: 'always' })}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className={styles.empty}>{t('Aucun bonus de statistiques.')}</p>
        )}
      </Popover>
    </>
  );
}
