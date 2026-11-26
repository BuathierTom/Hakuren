import { t } from '@/features/preferences/lib/i18n';
import { Icon } from '@/components/ui/icon/icon';
import { paginationEntries } from '../../lib/pagination';
import styles from './catalogue-pagination.module.scss';

interface CataloguePaginationProps {
  page: number;
  pages: number;
  label: string;
  loading?: boolean;
  onChange: (page: number) => void;
}

export function CataloguePagination({
  page,
  pages,
  label,
  onChange,
  loading = false,
}: CataloguePaginationProps) {
  return (
    <nav className={styles.pagination} aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={loading || page <= 1}
        aria-label={t('Page précédente')}
      >
        <Icon name="left" size={16} className={styles.directionIcon} />
        <span className={styles.directionText}>{t('Précédent')}</span>
      </button>
      <ol className={styles.pages}>
        {paginationEntries(page, pages).map((entry) => (
          <li key={entry}>
            {typeof entry === 'number' ? (
              <button
                type="button"
                className={styles.pageButton}
                aria-label={t('Page {0}', entry)}
                aria-current={entry === page ? 'page' : undefined}
                disabled={loading}
                onClick={() => {
                  if (entry !== page) onChange(entry);
                }}
              >
                {entry}
              </button>
            ) : (
              <span className={styles.gap} aria-hidden="true">
                ...
              </span>
            )}
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={loading || page >= pages}
        aria-label={t('Page suivante')}
      >
        <span className={styles.directionText}>{t('Suivant')}</span>
        <Icon name="right" size={16} className={styles.directionIcon} />
      </button>
    </nav>
  );
}
