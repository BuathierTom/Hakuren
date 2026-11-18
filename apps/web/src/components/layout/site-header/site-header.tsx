import { intercept, type View } from '@/app/navigation';
import styles from './site-header.module.scss';
export function SiteHeader({ view }: { view: View }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a
          href="/joueurs"
          className={styles.brand}
          onClick={(event) => intercept(event, '/joueurs')}
          aria-label="Hakuren, accueil"
        >
          <img src="/icon.webp" alt="" width="44" height="44" />
          <span>Hakuren</span>
        </a>
        <nav aria-label="Navigation principale" className={styles.nav}>
          <a
            href="/joueurs"
            aria-current={view === 'players' ? 'page' : undefined}
            onClick={(event) => intercept(event, '/joueurs')}
          >
            Joueurs
          </a>
          <a
            href="/catalogue"
            aria-current={view !== 'players' ? 'page' : undefined}
            onClick={(event) => intercept(event, '/catalogue')}
          >
            Catalogue
          </a>
        </nav>
        <span className={styles.game}>
          Inazuma Eleven <span>Victory Road</span>
        </span>
      </div>
    </header>
  );
}
