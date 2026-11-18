import { useEffect } from 'react';
import type { CatalogueFilters } from '@shared/catalogue';
import { SiteHeader } from '@/components/layout/site-header/site-header';
import { SiteFooter } from '@/components/layout/site-footer/site-footer';
import { Icon } from '@/components/ui/icon/icon';
import { useRequest } from '@/features/catalogue/hooks/use-catalogue-request';
import { href, intercept } from '@/app/navigation';
import { count, VIEWS } from '@/features/catalogue/lib/labels';
import styles from './catalogue-home-page.module.scss';
const sections = [
  { view: 'techniques', icon: 'bolt', description: 'Tirs, dribbles, défenses et pouvoirs.' },
  {
    view: 'equipment',
    icon: 'shirt',
    description: 'Chaussures, bracelets, pendentifs et accessoires.',
  },
  {
    view: 'tactics',
    icon: 'filters',
    description: 'Les tactiques collectives et leur coût en tension.',
  },
] as const;
export function CatalogueHomePage() {
  const metadata = useRequest<CatalogueFilters>('/api/catalogue');
  useEffect(() => {
    document.title = 'Catalogue · KizunaDex';
  }, []);
  return (
    <>
      <SiteHeader view="catalogue" />
      <main className={styles.main}>
        <h1>Catalogue</h1>
        <p className={styles.intro}>Choisis une rubrique.</p>
        <div className={styles.sections}>
          {sections.map((section) => {
            const target = href(section.view, {}, false);
            return (
              <a key={section.view} href={target} onClick={(event) => intercept(event, target)}>
                <span className={styles.icon}>
                  <Icon name={section.icon} size={26} />
                </span>
                <h2>{VIEWS[section.view]}</h2>
                <p>{section.description}</p>
                <span className={styles.bottom}>
                  <span>
                    {metadata.data?.counts[section.view] != null
                      ? count(metadata.data.counts[section.view]!)
                      : '—'}{' '}
                    entrées
                  </span>
                  <Icon name="arrow" size={18} />
                </span>
              </a>
            );
          })}
        </div>
        <SiteFooter />
      </main>
    </>
  );
}
