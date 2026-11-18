import type { Category, Element } from '@shared/catalogue';
import type { View } from '@/app/navigation';
import { ElementIcon, TechniqueTypeIcon } from '../game-icon/game-icon';
import {
  ELEMENTS,
  POSITIONS,
  TECHNIQUE_CATEGORIES,
  EQUIPMENT_SLOTS,
  GENDERS,
  PLAY_STYLES,
} from '../../lib/labels';
import { FilterGroup, type FilterOption } from './filter-group';
import styles from './catalogue-filters.module.scss';
interface CatalogueFiltersProps {
  view: View;
  params: URLSearchParams;
  activeCount: number;
  update: (patch: Record<string, string | number | null>) => void;
  reset: () => void;
}
export function CatalogueFilters({
  view,
  params,
  activeCount,
  update,
  reset,
}: CatalogueFiltersProps) {
  if (view === 'tactics') return null;
  const group = (key: string, label: string, options: FilterOption[], wide = false) => (
    <FilterGroup
      key={key}
      label={label}
      value={params.get(key)}
      options={options}
      wide={wide}
      onChange={(value) => update({ [key]: value })}
    />
  );
  const options = (labels: Record<string, string>) =>
    Object.entries(labels).map(([value, label]) => ({ value, label }));
  return (
    <section className={styles.filters} aria-label="Filtres du catalogue" data-view={view}>
      <div className={styles.groups}>
        {view === 'players' && (
          <>
            {group('gender', 'Sexes', options(GENDERS))}
            {group(
              'position',
              'Poste',
              Object.entries(POSITIONS).map(([value, label]) => ({
                value,
                label: `${value} · ${label}`,
                shortLabel: value,
              })),
            )}
          </>
        )}
        {view === 'techniques' &&
          group(
            'category',
            'Type de technique',
            TECHNIQUE_CATEGORIES.map(([value, label]) => ({
              value,
              label,
              icon: <TechniqueTypeIcon category={value as Category} />,
            })),
            true,
          )}
        {(view === 'players' || view === 'techniques') &&
          group(
            'element',
            'Éléments',
            Object.entries(ELEMENTS)
              .filter(([value]) => view === 'players' || value !== 'void')
              .map(([value, label]) => ({
                value,
                label,
                icon: <ElementIcon element={value as Element} />,
                iconOnly: true,
              })),
          )}
        {view === 'players' && (
          <>
            {group('style', 'Styles', options(PLAY_STYLES), true)}
            {group('rarity', 'HERO / BASARA', [
              { value: 'hero', label: 'HERO' },
              { value: 'basara', label: 'BASARA' },
            ])}
          </>
        )}
        {view === 'equipment' && group('slot', 'Catégories', options(EQUIPMENT_SLOTS), true)}
      </div>
      {activeCount > 0 && (
        <button type="button" className={styles.reset} onClick={reset}>
          Effacer les filtres ({activeCount})
        </button>
      )}
    </section>
  );
}
