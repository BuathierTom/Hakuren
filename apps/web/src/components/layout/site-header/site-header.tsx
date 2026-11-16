import { Icon } from '@/components/ui/icon/icon';
import { intercept, type View } from '@/app/navigation';
import styles from './site-header.module.scss';

export function SiteHeader({ view }: { view: View }) {
  const isPlayers = view === 'players';
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <a
          href="/joueurs"
          className={styles.brand}
          onClick={(event) => intercept(event, '/joueurs')}
          aria-label="KizunaDex, accueil"
        >
          <img src="/icon.webp" alt="" width="43" height="43" />
          <span>
            Kizuna<span>Dex</span>
          </span>
        </a>
        <nav aria-label="Navigation principale" className={styles.nav}>
          <a
            href="/joueurs"
            aria-current={isPlayers ? 'page' : undefined}
            onClick={(event) => intercept(event, '/joueurs')}
          >
            <Icon name="shirt" size={18} />
            Joueurs
          </a>
          <a
            href="/techniques"
            aria-current={!isPlayers ? 'page' : undefined}
            onClick={(event) => intercept(event, '/techniques')}
          >
            <Icon name="bolt" size={18} />
            Techniques
          </a>
        </nav>
        <span className={styles.gameBadge}>
          <span />
          VICTORY ROAD
        </span>
      </div>
    </header>
  );
}
