import { t } from '@/features/preferences/lib/i18n';
import type { ReactNode } from 'react';
import styles from './catalogue-filters.module.scss';
export interface FilterOption {
  value: string;
  label: string;
  icon?: ReactNode;
  iconOnly?: boolean;
}
interface FilterGroupProps {
  label: string;
  value: string | null;
  options: FilterOption[];
  onChange: (value: string | null) => void;
}
export function FilterGroup({ label, value, options, onChange }: FilterGroupProps) {
  return (
    <fieldset className={styles.group}>
      <legend>{t(label)}</legend>
      <div className={styles.options}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-label={t(option.label)}
            title={t(option.label)}
            aria-pressed={value === option.value}
            onClick={() => onChange(value === option.value ? null : option.value)}
          >
            {option.icon}
            <span className={option.iconOnly ? 'sr-only' : undefined}>{t(option.label)}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
