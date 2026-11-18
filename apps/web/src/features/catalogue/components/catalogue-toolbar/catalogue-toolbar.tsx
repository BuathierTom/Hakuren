import type { View } from '@/app/navigation';
import { VIEWS, WORK_LABELS } from '../../lib/labels';
import { Icon } from '@/components/ui/icon/icon';
import styles from './catalogue-toolbar.module.scss';
interface CatalogueToolbarProps {
  view: View;
  isPlayers: boolean;
  search: string;
  work: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchClear: () => void;
  onWorkChange: (value: string) => void;
}
export function CatalogueToolbar({
  view,
  isPlayers,
  search,
  work,
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  onWorkChange,
}: CatalogueToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <form
        className={styles.search}
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          onSearchSubmit();
        }}
      >
        <label htmlFor="catalogue-search" className="sr-only">
          {isPlayers
            ? 'Rechercher un joueur ou une équipe'
            : `Rechercher dans les ${VIEWS[view].toLowerCase()}`}
        </label>
        <Icon name="search" size={19} />
        <input
          id="catalogue-search"
          type="search"
          autoComplete="off"
          maxLength={100}
          placeholder={
            isPlayers
              ? 'Un joueur, une équipe…'
              : `Rechercher dans les ${VIEWS[view].toLowerCase()}…`
          }
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              onSearchClear();
            }}
            aria-label="Effacer la recherche"
          >
            <Icon name="close" size={16} />
          </button>
        )}
        <kbd>/</kbd>
      </form>
      {isPlayers && (
        <div className={`${styles.select} ${styles.workSelect}`}>
          <label className="sr-only" htmlFor="work-filter">
            Jeu
          </label>
          <select
            id="work-filter"
            value={work}
            onChange={(event) => onWorkChange(event.target.value)}
          >
            <option value="">Tous les jeux</option>
            {Object.entries(WORK_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
          <Icon name="down" size={14} />
        </div>
      )}
    </div>
  );
}
