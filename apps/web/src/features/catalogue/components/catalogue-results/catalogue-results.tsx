import type { useCatalogue } from '../../hooks/use-catalogue';
import { Icon } from '@/components/ui/icon/icon';
import { count } from '../../lib/labels';
import { PlayerCard } from '../player-card/player-card';
import { TechniqueCard } from '../technique-card/technique-card';
import styles from './catalogue-results.module.scss';
export function CatalogueResults({ catalogue }: { catalogue: ReturnType<typeof useCatalogue> }) {
  const {
    isPlayers,
    list,
    players,
    techniques,
    request,
    data,
    page,
    active,
    update,
    reset,
    changePage,
    chipLabel,
    setLayout,
  } = catalogue;
  return (
    <>
      {' '}
      <div className={styles.resultsHeading}>
        <p aria-live="polite">
          {request.loading ? (
            <span>Recherche en cours…</span>
          ) : data ? (
            <>
              <strong>{count(data.total)}</strong>{' '}
              {isPlayers
                ? data.total > 1
                  ? 'joueurs'
                  : 'joueur'
                : data.total > 1
                  ? 'techniques'
                  : 'technique'}
              <span className={styles.resultSuffix}> à découvrir</span>
            </>
          ) : (
            'Résultats'
          )}
        </p>
        <div className={styles.layoutToggle} aria-label="Disposition des résultats">
          <button
            aria-label="Afficher en grille"
            aria-pressed={!list}
            onClick={() => setLayout(false)}
          >
            <Icon name="grid" size={15} />
          </button>
          <button
            aria-label="Afficher en liste"
            aria-pressed={list}
            onClick={() => setLayout(true)}
          >
            <Icon name="list" size={16} />
          </button>
        </div>
      </div>
      {active.length > 0 && (
        <div className={styles.chips}>
          {active.map((key) => (
            <button
              key={key}
              onClick={() => update({ [key]: null })}
              aria-label={`Retirer le filtre ${chipLabel(key)}`}
            >
              {chipLabel(key)}
              <Icon name="close" size={12} />
            </button>
          ))}
        </div>
      )}
      {request.error ? (
        <div className={styles.empty} role="alert">
          <span className={styles.emptyIcon}>
            <Icon name="info" size={30} />
          </span>
          <h2>Petit contretemps.</h2>
          <p>{request.error.message}</p>
          <button className={styles.primaryButton} onClick={request.retry}>
            <Icon name="reset" size={16} />
            Réessayer
          </button>
          <button className={styles.textButton} onClick={reset}>
            Réinitialiser les filtres
          </button>
        </div>
      ) : request.loading ? (
        <div
          className={`${styles.grid} ${list ? styles.list : ''}`}
          aria-label="Chargement des résultats"
        >
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className={styles.skeleton}>
              <div />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : !data?.items.length ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <Icon name="search" size={30} />
          </span>
          <h2>Aucun résultat sur le terrain.</h2>
          <p>Essaie un autre nom ou élargis tes filtres.</p>
          <button className={styles.primaryButton} onClick={reset}>
            <Icon name="reset" size={16} />
            Repartir de zéro
          </button>
        </div>
      ) : (
        <>
          <div className={`${styles.grid} ${list ? styles.list : ''}`}>
            {isPlayers
              ? players.data?.items.map((player) => (
                  <PlayerCard key={player.id} player={player} list={list} />
                ))
              : techniques.data?.items.map((technique) => (
                  <TechniqueCard key={technique.id} technique={technique} list={list} />
                ))}
          </div>
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
                <Icon name="left" size={16} />
              </button>
              <span>
                Page <strong>{data.page}</strong> / {data.pages}
              </span>
              <button
                onClick={() => changePage(page + 1)}
                disabled={page >= data.pages}
                aria-label="Page suivante"
              >
                <Icon name="right" size={16} />
              </button>
            </div>
          </nav>
        </>
      )}
    </>
  );
}
