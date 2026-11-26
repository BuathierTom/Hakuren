import { t } from '@/features/preferences/lib/i18n';
import { HeaderPreferences } from '@/features/preferences/components/header-preferences/header-preferences';
import { AccountControl } from '@/features/auth/components/account-control/account-control';
import { AuthNotice } from '@/features/auth/components/auth-notice/auth-notice';
import { intercept, type View } from '@/app/navigation';
import styles from './site-header.module.scss';
export function SiteHeader({ view }: { view: View }) {
  return (
    <>
      <header className={styles.header} data-site-header>
        <div className={styles.inner}>
          <a
            href="/"
            className={styles.brand}
            onClick={(event) => intercept(event, '/')}
            aria-label={t('Hakuren, accueil')}
          >
            <img src="/icon.webp" alt="" width="44" height="44" />
            <span>Hakuren</span>
          </a>
          <nav aria-label={t('Navigation principale')} className={styles.nav}>
            <a
              href="/"
              aria-current={view === 'builder' ? 'page' : undefined}
              onClick={(event) => intercept(event, '/')}
            >
              {t('Composition')}
            </a>
            <a
              href="/joueurs"
              aria-current={view === 'players' ? 'page' : undefined}
              onClick={(event) => intercept(event, '/joueurs')}
            >
              {t('Joueurs')}
            </a>
            <a
              href="/wiki"
              aria-current={
                ['catalogue', 'techniques', 'equipment', 'tactics', 'passives', 'teams'].includes(
                  view,
                )
                  ? 'page'
                  : undefined
              }
              onClick={(event) => intercept(event, '/wiki')}
            >
              {t('Catalogue')}
            </a>
          </nav>
          <div className={styles.account}>
            <HeaderPreferences />
            <AccountControl />
          </div>
        </div>
      </header>
      <AuthNotice />
    </>
  );
}
