import type { Category, Element, Gender, PlayStyle, Position } from '@shared/catalogue';
import type { View } from '@/app/navigation';
import {
  ElementIcon,
  GenderIcon,
  PlayStyleIcon,
  PositionIcon,
  TechniqueTypeIcon,
} from '../game-icon/game-icon';
import {
  ELEMENTS,
  POSITIONS,
  TECHNIQUE_CATEGORIES,
  EQUIPMENT_SLOTS,
  GENDERS,
  PLAY_STYLES,
  PLAYER_TYPES,
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
  const group = (key: string, label: string, options: FilterOption[]) => (
    <FilterGroup
      key={key}
      label={label}
      value={params.get(key) ?? ''}
      options={options}
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
            {group(
              'gender',
              'Sexes',
              Object.entries(GENDERS).map(([value, label]) => ({
                value,
                label,
                icon: <GenderIcon gender={value as Gender} />,
              })),
            )}
            {group(
              'position',
              'Poste',
              Object.entries(POSITIONS).map(([value, label]) => ({
                value,
                label,
                icon: <PositionIcon position={value as Position} />,
                iconOnly: true,
              })),
            )}
            {group('role', 'Type de joueur', [
              { value: '', label: 'All' },
              ...['manager', 'coordinator'].map((value) => ({
                value,
                label: PLAYER_TYPES[value]!,
              })),
            ])}
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
          )}
        {(view === 'players' || view === 'techniques') &&
          group(
            'element',
            'Éléments',
            Object.entries(ELEMENTS).map(([value, label]) => ({
              value,
              label,
              icon: <ElementIcon element={value as Element} />,
              iconOnly: true,
            })),
          )}
        {view === 'players' && (
          <>
            {group(
              'style',
              'Styles',
              Object.entries(PLAY_STYLES).map(([value, label]) => ({
                value,
                label,
                icon: <PlayStyleIcon style={value as PlayStyle} />,
              })),
            )}
            {group('rarity', 'Rareté', [
              { value: 'hero', label: 'HERO' },
              { value: 'basara', label: 'BASARA' },
            ])}
          </>
        )}
        {view === 'equipment' && group('slot', 'Catégories', options(EQUIPMENT_SLOTS))}
      </div>
      {activeCount > 0 && (
        <button type="button" className={styles.reset} onClick={reset}>
          Effacer les filtres ({activeCount})
        </button>
      )}
    </section>
  );
}
