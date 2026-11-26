import { t } from '@/features/preferences/lib/i18n';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from '../icon/icon';
import styles from './confirmation-dialog.module.scss';
export function ConfirmationDialog({
  title,
  children,
  confirmLabel,
  busy = false,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
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
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => event.preventDefault()}
      aria-busy={busy}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          aria-label={t('Fermer la confirmation')}
          onClick={onClose}
          disabled={busy}
        >
          <Icon name="close" size={22} />
        </button>
      </header>
      <div className={styles.body}>
        {children}
        <div className={styles.actions}>
          <button type="button" onClick={onClose} disabled={busy} autoFocus>
            {t('Annuler')}
          </button>
          <button className={styles.confirm} type="button" onClick={onConfirm} disabled={busy}>
            {busy ? t('Suppression…') : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
