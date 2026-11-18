import type { ReactNode } from 'react';
import styles from './entry-statistics.module.scss';
export function EntryStatistics({ fields }: { fields: { label: string; value: ReactNode }[] }) {
  return (
    <div className={styles.wrapper} role="region" aria-label="Caractéristiques" tabIndex={0}>
      <table className={styles.table}>
        <thead>
          <tr>
            {fields.map((field) => (
              <th key={field.label} scope="col">
                {field.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {fields.map((field) => (
              <td key={field.label}>{field.value}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
