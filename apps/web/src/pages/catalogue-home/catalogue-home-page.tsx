import { useEffect } from 'react';
import type { CatalogueFilters } from '@shared/catalogue';
import { SiteHeader } from '@/components/layout/site-header/site-header';
import { SiteFooter } from '@/components/layout/site-footer/site-footer';
import { useRequest } from '@/features/catalogue/hooks/use-catalogue-request';
import { href, intercept } from '@/app/navigation';
import { count, VIEWS } from '@/features/catalogue/lib/labels';
import styles from './catalogue-home-page.module.scss';
const sections = [
  { view: 'techniques', description: 'Tirs, dribbles, défenses, arrêts et pouvoirs.' },
  { view: 'equipment', description: 'Chaussures, bracelets, pendentifs et accessoires.' },
  { view: 'tactics', description: 'Tactiques collectives et coûts en tension.' },
] as const;
export function CatalogueHomePage() {
  const metadata = useRequest<CatalogueFilters>('/api/catalogue');
  useEffect(() => {
    document.title = 'Catalogue - Hakuren';
  }, []);
  return (
    <>
      <SiteHeader view="catalogue" />
      <main className={styles.main}>
        <h1>Catalogue</h1>
        <p className={styles.intro}>Techniques, équipements et tactiques de Victory Road.</p>
        <div className={styles.sections}>
          {sections.map((section) => {
            const target = href(section.view, {}, false);
            const total = metadata.data?.counts[section.view];
            return (
              <a key={section.view} href={target} onClick={(event) => intercept(event, target)}>
                <h2>
                  {VIEWS[section.view]}
                  <span>{total != null ? count(total) : '—'}</span>
                </h2>
                <p>{section.description}</p>
              </a>
            );
          })}
        </div>
        <SiteFooter />
      </main>
    </>
  );
}
