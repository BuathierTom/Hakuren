import type { CatalogueFilters as Metadata, Element } from '@shared/catalogue';
import { Icon } from '@/components/ui/icon/icon';
import { ElementBadge } from '../catalogue-badges/catalogue-badges';
import { TechniqueTypeIcon } from '../game-icon/game-icon';
import {
  count,
  ELEMENTS,
  POSITIONS,
  workLabel,
  TECHNIQUE_CATEGORIES,
  EQUIPMENT_SLOTS,
  VIEWS,
} from '../../lib/labels';
import { href, intercept, type View } from '@/app/navigation';
import styles from './catalogue-filters.module.scss';
interface CatalogueFiltersProps {
  view: View;
  params: URLSearchParams;
  metadata: Metadata | null;
  loading: boolean;
  open: boolean;
  activeCount: number;
  update: (patch: Record<string, string | number | null>) => void;
  reset: () => void;
}
export function CatalogueFilters({
  view,
  params,
  metadata,
  loading,
  open,
  activeCount,
  update,
  reset,
}: CatalogueFiltersProps) {
  const isPlayers = view === 'players';
  return (
    <aside
      id="catalogue-filters"
      aria-label="Filtres du catalogue"
      className={`${styles.filters} ${open ? styles.filtersOpen : ''}`}
    >
      <div className={styles.filterHeading}>
        <h2>
          <Icon name="filters" size={17} />
          Filtres
        </h2>
        <button onClick={reset} disabled={!activeCount} title="Réinitialiser les filtres">
          <Icon name="reset" size={15} />
          <span>Effacer</span>
        </button>
      </div>
      {!isPlayers && (
        <nav className={styles.sections} aria-label="Rubriques du catalogue">
          {(['techniques', 'equipment', 'tactics'] as const).map((section) => (
            <a
              key={section}
              href={href(section, {}, false)}
              aria-current={view === section ? 'page' : undefined}
              onClick={(event) => intercept(event, href(section, {}, false))}
            >
              {VIEWS[section]}
              <Icon name="right" size={14} />
            </a>
          ))}
        </nav>
      )}
      {isPlayers && (
        <>
          <div className={styles.filterSection}>
            <label htmlFor="work-filter">Génération</label>
            <div className={styles.select}>
              <select
                id="work-filter"
                value={params.get('work') ?? ''}
                disabled={loading}
                onChange={(event) => update({ work: event.target.value })}
              >
                <option value="">Toutes les générations</option>
                {metadata?.works.map((work) => (
                  <option key={work.code} value={work.code}>
                    {workLabel(work.code)} ({count(work.playerCount)})
                  </option>
                ))}
              </select>
              <Icon name="down" size={14} />
            </div>
          </div>
          <fieldset className={styles.filterSection}>
            <legend>Poste</legend>
            <div className={styles.positionOptions}>
              {Object.entries(POSITIONS).map(([code, label]) => (
                <button
                  key={code}
                  aria-pressed={params.get('position') === code}
                  onClick={() =>
                    update({ position: params.get('position') === code ? null : code })
                  }
                >
                  <span>{code}</span>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      )}
      {view === 'techniques' && (
        <fieldset className={styles.filterSection}>
          <legend>Type de technique</legend>
          <div className={styles.categoryOptions}>
            {TECHNIQUE_CATEGORIES.map(([code, label]) => (
              <button
                key={code}
                aria-pressed={params.get('category') === code}
                onClick={() => update({ category: params.get('category') === code ? null : code })}
              >
                <TechniqueTypeIcon
                  category={code as Parameters<typeof TechniqueTypeIcon>[0]['category']}
                />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {(isPlayers || view === 'techniques') && (
        <fieldset className={styles.filterSection}>
          <legend>Elements</legend>
          <div className={styles.elementOptions}>
            {Object.keys(ELEMENTS)
              .filter((code) => isPlayers || code !== 'void')
              .map((code) => (
                <button
                  key={code}
                  aria-pressed={params.get('element') === code}
                  onClick={() => update({ element: params.get('element') === code ? null : code })}
                >
                  <ElementBadge element={code as Element} />
                </button>
              ))}
          </div>
        </fieldset>
      )}
      {view === 'equipment' && (
        <fieldset className={styles.filterSection}>
          <legend>Catégorie</legend>
          <div className={styles.categoryOptions}>
            {Object.entries(EQUIPMENT_SLOTS).map(([code, label]) => (
              <button
                key={code}
                aria-pressed={params.get('slot') === code}
                onClick={() => update({ slot: params.get('slot') === code ? null : code })}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {isPlayers && (
        <>
          <div className={styles.filterSection}>
            <label htmlFor="rarity-filter">Rareté</label>
            <div className={styles.select}>
              <select
                id="rarity-filter"
                value={params.get('rarity') ?? ''}
                onChange={(event) => update({ rarity: event.target.value })}
              >
                <option value="">Toutes les raretés</option>
                {metadata?.rarities.map((rarity) => (
                  <option key={rarity.code} value={rarity.code}>
                    {rarity.name}
                  </option>
                ))}
              </select>
              <Icon name="down" size={14} />
            </div>
          </div>
          <div className={styles.filterSection}>
            <label htmlFor="role-filter">Profil</label>
            <div className={styles.select}>
              <select
                id="role-filter"
                value={params.get('role') ?? ''}
                onChange={(event) => update({ role: event.target.value })}
              >
                <option value="">Tous les profils</option>
                <option value="player">Joueurs</option>
                <option value="staff">Encadrement</option>
              </select>
              <Icon name="down" size={14} />
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
