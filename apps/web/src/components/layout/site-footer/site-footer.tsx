import { Icon } from '@/components/ui/icon/icon';
import styles from './site-footer.module.scss';
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <span>
        <Icon name="bolt" size={14} />
        KizunaDex
      </span>
      <span>Inazuma Eleven · Victory Road</span>
    </footer>
  );
}
