import { useMemo } from 'react';
import type { LoadoutOptions, EquipmentSlot } from '@shared/catalogue';
import { Select } from '@/components/ui/select/select';
import { Icon } from '@/components/ui/icon/icon';
import { PlayerDetailBlock } from '@/features/catalogue/components/player-detail-block/player-detail-block';
import { EQUIPMENT_SLOTS } from '@/features/catalogue/lib/labels';
import { useRequest } from '@/features/catalogue/hooks/use-catalogue-request';
import type { Assignment } from '../../lib/team';
import {
  EQUIPMENT_ORDER,
  fillEquipment,
  fillPassives,
  groupedPassives,
  passiveSource,
  setPassive,
} from '../../lib/loadouts';
import { EquipmentPreview } from './equipment-preview';
import styles from './player-loadout.module.scss';
export function PlayerLoadout({
  assignment,
  slot,
  onChange,
}: {
  assignment: Assignment;
  slot: string;
  onChange: (assignment: Assignment) => void;
}) {
  const request = useRequest<LoadoutOptions>('/api/catalogue/loadouts');
  const equipment = request.data?.equipment ?? [];
  const passives = request.data?.passives ?? [];
  const grouped = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) =>
        groupedPassives(passives, passiveSource(slot, index), assignment.rarity),
      ),
    [passives, slot, assignment.rarity],
  );
  const equipmentOptions = (type: EquipmentSlot) => {
    const options = equipment
      .filter((item) => item.slot === type)
      .map((item) => ({
        value: String(item.id),
        label: item.name,
        icon: item.imageUrl ? (
          <img src={item.imageUrl} alt="" width="20" height="20" loading="lazy" />
        ) : (
          <Icon name="shirt" size={16} />
        ),
      }));
    const selected = assignment.equipment?.[type];
    if (selected && !options.some((item) => item.value === String(selected)))
      options.push({
        value: String(selected),
        label: 'Équipement indisponible',
        icon: <Icon name="shirt" size={16} />,
      });
    return [{ value: '', label: '—' }, ...options];
  };
  const action = (kind: 'equipment' | 'passives') => (
    <div className={styles.actions}>
      <button
        className={styles.fill}
        type="button"
        disabled={
          !request.data ||
          (kind === 'equipment'
            ? EQUIPMENT_ORDER.every((type) => assignment.equipment?.[type])
            : Array.from({ length: 6 }, (_, index) => assignment.passives?.[index]).every(Boolean))
        }
        onClick={() =>
          onChange(
            kind === 'equipment'
              ? fillEquipment(assignment, equipment)
              : fillPassives(assignment, slot, passives),
          )
        }
      >
        <Icon name="sparkles" size={14} />
        {kind === 'equipment' ? 'Remplir les équipements vides' : 'Remplir les passifs vides'}
      </button>
      <button
        className={styles.clear}
        type="button"
        aria-label={kind === 'equipment' ? 'Vider les équipements' : 'Vider les passifs'}
        title={kind === 'equipment' ? 'Vider les équipements' : 'Vider les passifs'}
        disabled={
          kind === 'equipment'
            ? !Object.values(assignment.equipment ?? {}).some(Boolean)
            : !assignment.passives?.some(Boolean)
        }
        onClick={() =>
          onChange(
            kind === 'equipment'
              ? { ...assignment, equipment: {} }
              : { ...assignment, passives: [] },
          )
        }
      >
        <Icon name="trash" size={16} />
      </button>
    </div>
  );
  return (
    <div className={styles.root}>
      {request.loading && (
        <p className={styles.state} role="status">
          Chargement des équipements et passifs…
        </p>
      )}
      {request.error && (
        <div className={styles.state} role="alert">
          <p>{request.error.message}</p>
          <button type="button" onClick={request.retry}>
            Réessayer
          </button>
        </div>
      )}
      <div className={styles.panels}>
        <PlayerDetailBlock title="Équipements" action={action('equipment')}>
          <div className={styles.rows}>
            {EQUIPMENT_ORDER.map((type) => {
              const selected = equipment.find(
                (item) => item.slot === type && item.id === assignment.equipment?.[type],
              );
              return (
                <div className={styles.equipmentRow} key={type}>
                  <EquipmentPreview
                    key={selected?.id ?? type}
                    item={selected}
                    label={EQUIPMENT_SLOTS[type]}
                  />
                  <span className={styles.label}>{EQUIPMENT_SLOTS[type]}</span>
                  <Select
                    label={`Équipement - ${EQUIPMENT_SLOTS[type]}`}
                    value={String(assignment.equipment?.[type] ?? '')}
                    options={equipmentOptions(type)}
                    showSelectedIcon={false}
                    searchable
                    disabled={!request.data}
                    onChange={(value) =>
                      onChange({
                        ...assignment,
                        equipment: {
                          ...assignment.equipment,
                          [type]: value ? Number(value) : null,
                        },
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        </PlayerDetailBlock>
        <PlayerDetailBlock title="Passifs" action={action('passives')}>
          <div className={styles.rows}>
            {Array.from({ length: 6 }, (_, index) => {
              const label = index === 5 ? 'Custom' : `Preset ${index + 1}`;
              const current = assignment.passives?.[index];
              const selected = passives.find((passive) => passive.id === current?.id);
              const candidates = grouped[index]!;
              const options = [
                { value: '', label: '—' },
                ...(selected && !candidates.some((p) => p.id === selected.id)
                  ? [selected, ...candidates]
                  : candidates
                ).map((passive) => ({
                  value: String(passive.id),
                  label:
                    current?.id === passive.id
                      ? passive.name.replaceAll(
                          '…',
                          current.value.toLocaleString('fr-FR', { maximumFractionDigits: 4 }),
                        )
                      : passive.description,
                })),
              ];
              if (current && !selected)
                options.push({ value: String(current.id), label: 'Passif indisponible' });
              return (
                <div className={styles.passiveRow} key={index}>
                  <span className={styles.label}>{label}</span>
                  <Select
                    label={label}
                    value={String(current?.id ?? '')}
                    options={options}
                    searchable
                    disabled={!request.data}
                    onChange={(value) =>
                      onChange(
                        setPassive(
                          assignment,
                          index,
                          passives.find((p) => p.id === Number(value)) ?? null,
                        ),
                      )
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    max="99999"
                    step={selected?.unit === 'points' ? '1' : '0.1'}
                    aria-label={`Valeur ${label}`}
                    value={current?.value ?? ''}
                    disabled={!current || !request.data}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (!current || !Number.isFinite(value) || value < 0 || value > 99999) return;
                      const next = Array.from(
                        { length: 6 },
                        (_, i) => assignment.passives?.[i] ?? null,
                      );
                      next[index] = { ...current, value };
                      onChange({ ...assignment, passives: next });
                    }}
                  />
                  <span className={styles.unit}>{selected?.unit === 'points' ? '' : '%'}</span>
                </div>
              );
            })}
          </div>
        </PlayerDetailBlock>
      </div>
    </div>
  );
}
