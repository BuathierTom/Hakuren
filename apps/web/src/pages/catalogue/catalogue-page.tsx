import { href, intercept } from '@/app/navigation';
import { VIEWS } from '@/features/catalogue/lib/labels';
import { useCatalogue } from '@/features/catalogue/hooks/use-catalogue';
import { Icon } from '@/components/ui/icon/icon';
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
    filtersOpen,
    setFiltersOpen,
    resultsRef,
    metadata,
    request,
    active,
    update,
    reset,
  } = catalogue;
  return (
    <>
      <a className={styles.skip} href="#results">
        Aller aux résultats
      </a>
      <SiteHeader view={view} />

      <main className={styles.main}>
        <h1 className="sr-only" id="page-title">
          {VIEWS[view]}
        </h1>
        {!isPlayers && (
          <nav className={styles.breadcrumb} aria-label="Fil d’Ariane">
            <a
              href={href('catalogue', {}, false)}
              onClick={(event) => intercept(event, href('catalogue', {}, false))}
            >
              Catalogue
            </a>
            <span>/</span>
            <span>{VIEWS[view]}</span>
          </nav>
        )}
        <div className={styles.workspace}>
          <button
            className={styles.mobileFilters}
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="catalogue-filters"
          >
            <Icon name="filters" />
            {filtersOpen ? 'Masquer les filtres' : 'Afficher les filtres'}
            {active.length > 0 && <span>{active.length}</span>}
          </button>
          <CatalogueFilters
            view={view}
            params={params}
            metadata={metadata.data}
            loading={metadata.loading}
            open={filtersOpen}
            activeCount={active.length}
            update={update}
            reset={reset}
          />

          <section
            id="results"
            ref={resultsRef}
            className={styles.results}
            aria-label={`Catalogue des ${VIEWS[view].toLowerCase()}`}
            aria-busy={request.loading}
          >
            <CatalogueToolbar
              view={view}
              isPlayers={isPlayers}
              search={search}
              sort={params.get('sort') ?? 'number'}
              onSearchChange={setSearch}
              onSearchSubmit={() => update({ q: search.trim() }, true)}
              onSearchClear={() => {
                setSearch('');
                update({ q: null }, true);
              }}
              onSortChange={(sort) => update({ sort })}
            />
            <CatalogueResults catalogue={catalogue} />
          </section>
        </div>
        <SiteFooter />
      </main>
      {detail !== null && (
        <DetailDialog
          key={`${view}/${detail}`}
          view={view}
          id={detail}
          selectedWork={params.get('work')}
        />
      )}
    </>
  );
}
