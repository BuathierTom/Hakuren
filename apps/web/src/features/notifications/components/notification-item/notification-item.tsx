import { t } from '@/features/preferences/lib/i18n';
import { useEffect } from 'react';
import type { Notification } from '../../notification-context';
import { NOTIFICATION_DURATION, NOTIFICATION_TRANSITION } from '../../notification-timing';
import styles from './notification-item.module.scss';
export function NotificationItem({
  notification,
  dismiss,
}: {
  notification: Notification;
  dismiss: (id: string) => void;
}) {
  const tone = notification.tone ?? 'info';
  useEffect(() => {
    if (notification.closing) return;
    const remaining = Math.max(
      0,
      notification.createdAt + NOTIFICATION_DURATION - NOTIFICATION_TRANSITION - Date.now(),
    );
    const timer = window.setTimeout(() => dismiss(notification.id), remaining);
    return () => window.clearTimeout(timer);
  }, [notification.id, notification.createdAt, notification.closing, dismiss]);
  return (
    <div
      className={styles.notification}
      data-tone={tone}
      data-closing={notification.closing || undefined}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      onClick={() => dismiss(notification.id)}
    >
      <button type="button" className={styles.message} title={t('Fermer la notification')}>
        {notification.message}
      </button>
      {notification.action && (
        <button
          type="button"
          className={styles.action}
          onClick={(event) => {
            event.stopPropagation();
            dismiss(notification.id);
            notification.action!.onClick();
          }}
        >
          {notification.action.label}
        </button>
      )}
    </div>
  );
}
