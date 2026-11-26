import { t } from '@/features/preferences/lib/i18n';
import { href, intercept } from '@/app/navigation';
import { VIEWS } from '@/features/catalogue/lib/labels';
import { useCatalogue } from '@/features/catalogue/hooks/use-catalogue';
import { SiteHeader } from '@/components/layout/site-header/site-header';
import { SiteFooter } from '@/components/layout/site-footer/site-footer';
import { CatalogueFilters } from '@/features/catalogue/components/catalogue-filters/catalogue-filters';
import { CatalogueToolbar } from '@/features/catalogue/components/catalogue-toolbar/catalogue-toolbar';
import { CatalogueResults } from '@/features/catalogue/components/catalogue-results/catalogue-results';
import { DetailDialog } from '@/features/catalogue/components/detail-dialog/detail-dialog';
import styles from './catalogue-page.module.scss';
export function CataloguePage() {
  const catalogue = useCatalogue();
  const {
    view,
    params,
    detail,
    isPlayers,
    search,
    setSearch,
    resultsRef,
    request,
    active,
    update,
    reset,
  } = catalogue;
  const back = href('catalogue', {}, false);
  return (
    <>
      <a className={styles.skip} href="#results">
        {t('Aller aux résultats')}
      </a>
      <SiteHeader view={view} />
      <main className={styles.main}>
        <div className={styles.title}>
          <h1>{t(VIEWS[view])}</h1>
          {!isPlayers && (
            <a href={back} onClick={(event) => intercept(event, back)}>
              {t('Retour au catalogue')}
            </a>
          )}
        </div>
        <CatalogueToolbar
          view={view}
          isPlayers={isPlayers}
          search={search}
          work={params.get('work') ?? ''}
          onSearchChange={setSearch}
          onSearchSubmit={() => update({ q: search.trim() }, true)}
          onSearchClear={() => {
            setSearch('');
            update({ q: null }, true);
          }}
          onWorkChange={(work) => update({ work })}
        />
        <CatalogueFilters
          view={view}
          params={params}
          activeCount={active.length}
          update={update}
          reset={reset}
        />
        <section
          id="results"
          ref={resultsRef}
          className={styles.results}
          aria-label={t('Catalogue des {0}', t(VIEWS[view]).toLowerCase())}
          aria-busy={request.loading}
        >
          <CatalogueResults catalogue={catalogue} />
        </section>
        <SiteFooter />
      </main>
      {detail !== null && <DetailDialog key={`${view}/${detail}`} view={view} id={detail} />}
    </>
  );
}
