import { t } from '@/features/preferences/lib/i18n';
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
  PASSIVE_SOURCES,
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
  if (view === 'tactics' || view === 'teams') return null;
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
    <section className={styles.filters} aria-label={t('Filtres du catalogue')} data-view={view}>
      <div className={styles.groups}>
        {view === 'players' && (
          <>
            {group(
              'gender',
              t('Sexes'),
              Object.entries(GENDERS).map(([value, label]) => ({
                value,
                label,
                icon: <GenderIcon gender={value as Gender} />,
              })),
            )}
            {group(
              'position',
              t('Poste'),
              Object.entries(POSITIONS).map(([value, label]) => ({
                value,
                label,
                icon: <PositionIcon position={value as Position} />,
                iconOnly: true,
              })),
            )}
            {group('role', t('Type de joueur'), [
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
            t('Type de technique'),
            TECHNIQUE_CATEGORIES.map(([value, label]) => ({
              value,
              label,
              icon: <TechniqueTypeIcon category={value as Category} />,
            })),
          )}
        {(view === 'players' || view === 'techniques') &&
          group(
            'element',
            t('Éléments'),
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
              t('Styles'),
              Object.entries(PLAY_STYLES).map(([value, label]) => ({
                value,
                label,
                icon: <PlayStyleIcon style={value as PlayStyle} />,
              })),
            )}
            {group('rarity', t('Rareté'), [
              { value: 'hero', label: t('Héro') },
              { value: 'basara', label: 'Basara' },
            ])}
          </>
        )}
        {view === 'passives' && (
          <>
            {group('source', t('Type de passif'), options(PASSIVE_SOURCES))}
            {group(
              'style',
              t('Styles'),
              Object.entries(PLAY_STYLES).map(([value, label]) => ({
                value,
                label,
                icon: <PlayStyleIcon style={value as PlayStyle} />,
              })),
            )}
          </>
        )}
        {view === 'equipment' && group('slot', t('Catégories'), options(EQUIPMENT_SLOTS))}
      </div>
      {activeCount > 0 && (
        <button type="button" className={styles.reset} onClick={reset}>
          {t('Effacer les filtres (')}
          {activeCount})
        </button>
      )}
    </section>
  );
}
