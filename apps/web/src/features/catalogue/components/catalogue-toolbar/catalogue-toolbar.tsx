import type { View } from '@/app/navigation';
import { VIEWS, WORK_LABELS } from '../../lib/labels';
import { Select } from '@/components/ui/select/select';
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
      {(isPlayers || view === 'teams') && (
        <Select
          className={styles.workSelect}
          label="Jeu"
          value={work}
          onChange={onWorkChange}
          size="large"
          options={[
            { value: '', label: 'Tous les jeux' },
            ...Object.entries(WORK_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
      )}
    </div>
  );
}
