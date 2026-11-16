import type { CatalogueFilters, Element } from '@shared/catalogue';
import { Icon } from '@/components/ui/icon/icon';
import { ElementBadge } from '@/features/catalogue/components/catalogue-badges/catalogue-badges';
import { CATEGORIES, count, ELEMENTS, POSITIONS, workLabel } from '@/features/catalogue/lib/labels';
import type { View } from '@/app/navigation';
import styles from './catalogue-filters.module.scss';

interface CatalogueFiltersProps {
  view: View;
  params: URLSearchParams;
  metadata: CatalogueFilters | null;
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
                {workLabel(work.code)}
                {isPlayers ? ` (${count(work.playerCount)})` : ''}
              </option>
            ))}
          </select>
          <Icon name="down" size={14} />
        </div>
      </div>
      {isPlayers ? (
        <>
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
      ) : (
        <div className={styles.filterSection}>
          <label htmlFor="category-filter">Type de technique</label>
          <div className={styles.select}>
            <select
              id="category-filter"
              value={params.get('category') ?? ''}
              onChange={(event) => update({ category: event.target.value })}
            >
              <option value="">Tous les types</option>
              {Object.entries(CATEGORIES).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
              <option value="unknown">Type à confirmer</option>
            </select>
            <Icon name="down" size={14} />
          </div>
        </div>
      )}
      <fieldset className={styles.filterSection}>
        <legend>Affinité</legend>
        <div className={styles.elementOptions}>
          {Object.keys(ELEMENTS).map((code) => (
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
      {isPlayers && (
        <>
          <div className={styles.filterSection}>
            <label htmlFor="rarity-filter">Rareté renseignée</label>
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
      <div className={styles.filterNote}>
        <Icon name="info" size={17} />
        <p>
          {isPlayers
            ? 'Un personnage peut avoir plusieurs fiches selon sa version.'
            : 'Les valeurs et les utilisateurs peuvent varier selon le jeu.'}
        </p>
      </div>
    </aside>
  );
}
