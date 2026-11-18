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
        aria-label="Page précédente"
      >
        Précédent
      </button>
      <span aria-label={`Page ${page} sur ${pages}`}>
        {page} / {pages}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={loading || page >= pages}
        aria-label="Page suivante"
      >
        Suivant
      </button>
    </nav>
  );
}
