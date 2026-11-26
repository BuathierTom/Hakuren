import { t } from '@/features/preferences/lib/i18n';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon/icon';
import styles from './team-dialog.module.scss';
export function TeamDialog({
  title,
  children,
  onClose,
  wide = false,
  actions,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  actions?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const node = dialog.current!;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node.showModal();
    return () => {
      node.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`${styles.dialog} ${wide ? styles.wide : ''}`}
      aria-labelledby={titleId}
      onCancel={(event) => event.preventDefault()}
    >
      <header className={styles.header}>
        <h2 id={titleId}>{title}</h2>
        <div className={styles.headerActions}>
          {actions}
          <button
            className={styles.close}
            type="button"
            aria-label={t('Fermer la modale')}
            onClick={onClose}
            autoFocus
          >
            <Icon name="close" size={22} />
          </button>
        </div>
      </header>
      <div className={styles.body}>{children}</div>
    </dialog>
  );
}
