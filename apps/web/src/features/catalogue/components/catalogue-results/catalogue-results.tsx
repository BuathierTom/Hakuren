import { t } from '@/features/preferences/lib/i18n';
import { PassiveList } from '../passive-list/passive-list';
import { TeamList } from '../team-list/team-list';
import type { useCatalogue } from '../../hooks/use-catalogue';
import { Icon } from '@/components/ui/icon/icon';
import { count, VIEWS } from '../../lib/labels';
import { PlayerList } from '../player-list/player-list';
import { TechniqueList } from '../technique-list/technique-list';
import { ItemList } from '../item-list/item-list';
import { CataloguePagination } from '../catalogue-pagination/catalogue-pagination';
import styles from './catalogue-results.module.scss';
const singular = {
  profile: 'profil',
  builder: 'composition',
  players: 'joueur',
  techniques: 'technique',
  equipment: 'équipement',
  tactics: 'tactique',
  catalogue: 'entrée',
  passives: 'passif',
  teams: 'équipe',
};
export function CatalogueResults({ catalogue }: { catalogue: ReturnType<typeof useCatalogue> }) {
  const {
    isPlayers,
    view,
    params,
    players,
    techniques,
    items,
    passives,
    teams,
    request,
    data,
    active,
    update,
    reset,
    changePage,
    chipLabel,
    pageListRef,
    minimumPageHeight,
  } = catalogue;
  return (
    <>
      <div className={styles.resultsHeading}>
        <p aria-live="polite">
          {request.loading && !data ? (
            t('Recherche en cours…')
          ) : data ? (
            <>
              <strong>{count(data.total)}</strong>{' '}
              {data.total === 1 ? t(singular[view]) : t(VIEWS[view]).toLowerCase()}
            </>
          ) : (
            t('Résultats')
          )}
        </p>
        {data && data.pages > 0 && !request.error && (
          <CataloguePagination
            page={data.page}
            pages={data.pages}
            label={t('Pagination en haut des résultats')}
            loading={request.loading}
            onChange={changePage}
          />
        )}
      </div>
      {active.length > 0 && (
        <div className={styles.chips}>
          {active.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => update({ [key]: null })}
              aria-label={t('Retirer le filtre {0}', chipLabel(key))}
            >
              {chipLabel(key)}
              <Icon name="close" size={13} />
            </button>
          ))}
        </div>
      )}
      {request.error ? (
        <div className={styles.empty} role="alert">
          <h2>{t('Chargement impossible')}</h2>
          <p>{request.error.message}</p>
          <button className={styles.primaryButton} onClick={request.retry}>
            {t('Réessayer')}
          </button>
        </div>
      ) : request.loading && !data ? (
        <div className={styles.loading} aria-label={t('Chargement des résultats')}>
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className={styles.skeleton} />
          ))}
        </div>
      ) : !data?.items.length ? (
        <div className={styles.empty}>
          <h2>{t('Aucun résultat')}</h2>
          <p>{t('Modifie ta recherche ou retire un filtre.')}</p>
          <button className={styles.primaryButton} onClick={reset}>
            {t('Effacer les filtres')}
          </button>
        </div>
      ) : (
        <>
          <div
            ref={pageListRef}
            className={styles.pageList}
            style={{ minHeight: minimumPageHeight }}
          >
            {isPlayers ? (
              <PlayerList players={players.data?.items ?? []} rarity={params.get('rarity')} />
            ) : view === 'techniques' ? (
              <TechniqueList techniques={techniques.data?.items ?? []} />
            ) : view === 'passives' ? (
              <PassiveList passives={passives.data?.items ?? []} />
            ) : view === 'teams' ? (
              <TeamList teams={teams.data?.items ?? []} />
            ) : (
              <ItemList items={items.data?.items ?? []} />
            )}
          </div>
          <div className={styles.paginationSummary}>
            <p>
              <strong>
                {count((data.page - 1) * data.limit + 1)}–
                {count(Math.min(data.page * data.limit, data.total))}
              </strong>{' '}
              {t('sur')} {count(data.total)}
            </p>
            <CataloguePagination
              page={data.page}
              pages={data.pages}
              label={t('Pagination en bas des résultats')}
              loading={request.loading}
              onChange={changePage}
            />
          </div>
        </>
      )}
    </>
  );
}
