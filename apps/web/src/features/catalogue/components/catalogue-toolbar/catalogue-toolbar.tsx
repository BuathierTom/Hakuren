import type { View } from '@/app/navigation';
import { VIEWS } from '../../lib/labels';
import { Icon } from '@/components/ui/icon/icon';
import styles from './catalogue-toolbar.module.scss';
interface CatalogueToolbarProps {
  view: View;
  isPlayers: boolean;
  search: string;
  sort: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchClear: () => void;
  onSortChange: (value: string) => void;
}
export function CatalogueToolbar({
  view,
  isPlayers,
  search,
  sort,
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  onSortChange,
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
          {isPlayers ? 'Rechercher un joueur' : `Rechercher dans les ${VIEWS[view].toLowerCase()}`}
        </label>
        <Icon name="search" size={19} />
        <input
          id="catalogue-search"
          type="search"
          autoComplete="off"
          maxLength={100}
          placeholder={
            isPlayers
              ? 'Un nom, un alias, un numéro…'
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
        <div className={`${styles.select} ${styles.sort}`}>
          <label className="sr-only" htmlFor="sort">
            Trier les joueurs
          </label>
          <select id="sort" value={sort} onChange={(event) => onSortChange(event.target.value)}>
            <option value="number">N° de joueur</option>
            <option value="name">Nom A → Z</option>
          </select>
          <Icon name="down" size={14} />
        </div>
      )}
    </div>
  );
}
