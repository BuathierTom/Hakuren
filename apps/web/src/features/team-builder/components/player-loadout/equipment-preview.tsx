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
        aria-label={item ? `Voir les bonus de ${item.name}` : `Aucun équipement - ${label}`}
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={open ? id : undefined}
        title={item ? `Voir les bonus de ${item.name}` : label}
        popoverTarget={id}
        onClick={(event) => {
          event.preventDefault();
          setOpen((current) => !current);
        }}
      >
        <EquipmentIcon src={item?.imageUrl ?? null} name={item?.name ?? label} />
      </button>
      <Popover
        id={id}
        anchor={open ? trigger.current : null}
        label={`Bonus de ${item?.name ?? label}`}
        role="tooltip"
        className={styles.preview}
        onClose={() => setOpen(false)}
      >
        {bonuses.length ? (
          <dl className={styles.stats}>
            {bonuses.map(({ stat, value }) => (
              <div key={stat}>
                <dt>{STAT_NAMES[stat]}</dt>
                <dd>{value.toLocaleString('fr-FR', { signDisplay: 'always' })}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className={styles.empty}>Aucun bonus de statistiques.</p>
        )}
      </Popover>
    </>
  );
}
