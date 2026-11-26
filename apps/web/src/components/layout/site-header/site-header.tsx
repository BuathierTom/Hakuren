import { InstallApp } from '@/features/pwa/components/install-app/install-app';
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
            aria-label="Hakuren, accueil"
          >
            <img src="/icon.webp" alt="" width="44" height="44" />
            <span>Hakuren</span>
          </a>
          <nav aria-label="Navigation principale" className={styles.nav}>
            <a
              href="/"
              aria-current={view === 'builder' ? 'page' : undefined}
              onClick={(event) => intercept(event, '/')}
            >
              Composition
            </a>
            <a
              href="/joueurs"
              aria-current={view === 'players' ? 'page' : undefined}
              onClick={(event) => intercept(event, '/joueurs')}
            >
              Joueurs
            </a>
            <a
              href="/catalogue"
              aria-current={view !== 'players' && view !== 'builder' ? 'page' : undefined}
              onClick={(event) => intercept(event, '/catalogue')}
            >
              Catalogue
            </a>
            <InstallApp />
          </nav>
          <div className={styles.account}>
            <AccountControl />
          </div>
        </div>
      </header>
      <AuthNotice />
    </>
  );
}
