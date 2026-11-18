import type { useCatalogue } from '../../hooks/use-catalogue';
import { Icon } from '@/components/ui/icon/icon';
import { count, VIEWS } from '../../lib/labels';
import { PlayerList } from '../player-list/player-list';
import { TechniqueList } from '../technique-list/technique-list';
import { ItemList } from '../item-list/item-list';
import styles from './catalogue-results.module.scss';
const singular = {
  players: 'joueur',
  techniques: 'technique',
  equipment: 'équipement',
  tactics: 'tactique',
  catalogue: 'entrée',
};
export function CatalogueResults({ catalogue }: { catalogue: ReturnType<typeof useCatalogue> }) {
  const {
    isPlayers,
    view,
    params,
    players,
    techniques,
    items,
    request,
    data,
    page,
    active,
    update,
    reset,
    changePage,
    chipLabel,
  } = catalogue;
  return (
    <>
      <div className={styles.resultsHeading}>
        <p aria-live="polite">
          {request.loading ? (
            'Recherche en cours…'
          ) : data ? (
            <>
              <strong>{count(data.total)}</strong>{' '}
              {data.total === 1 ? singular[view] : VIEWS[view].toLowerCase()}
            </>
          ) : (
            'Résultats'
          )}
        </p>
      </div>
      {active.length > 0 && (
        <div className={styles.chips}>
          {active.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => update({ [key]: null })}
              aria-label={`Retirer le filtre ${chipLabel(key)}`}
            >
              {chipLabel(key)}
              <Icon name="close" size={13} />
            </button>
          ))}
        </div>
      )}
      {request.error ? (
        <div className={styles.empty} role="alert">
          <h2>Chargement impossible</h2>
          <p>{request.error.message}</p>
          <button className={styles.primaryButton} onClick={request.retry}>
            Réessayer
          </button>
        </div>
      ) : request.loading ? (
        <div className={styles.loading} aria-label="Chargement des résultats">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className={styles.skeleton} />
          ))}
        </div>
      ) : !data?.items.length ? (
        <div className={styles.empty}>
          <h2>Aucun résultat</h2>
          <p>Modifie ta recherche ou retire un filtre.</p>
          <button className={styles.primaryButton} onClick={reset}>
            Effacer les filtres
          </button>
        </div>
      ) : (
        <>
          {isPlayers ? (
            <PlayerList players={players.data?.items ?? []} rarity={params.get('rarity')} />
          ) : view === 'techniques' ? (
            <TechniqueList techniques={techniques.data?.items ?? []} />
          ) : (
            <ItemList items={items.data?.items ?? []} />
          )}
          <nav className={styles.pagination} aria-label="Pagination">
            <p>
              <strong>
                {count((data.page - 1) * data.limit + 1)}–
                {count(Math.min(data.page * data.limit, data.total))}
              </strong>{' '}
              sur {count(data.total)}
            </p>
            <div>
              <button
                onClick={() => changePage(page - 1)}
                disabled={page <= 1}
                aria-label="Page précédente"
              >
                Précédent
              </button>
              <span>
                {data.page} / {data.pages}
              </span>
              <button
                onClick={() => changePage(page + 1)}
                disabled={page >= data.pages}
                aria-label="Page suivante"
              >
                Suivant
              </button>
            </div>
          </nav>
        </>
      )}
    </>
  );
}
