import { useLayoutEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { Notification } from '../../notification-context';
import { NOTIFICATION_TRANSITION } from '../../notification-timing';
import { NotificationItem } from '../notification-item/notification-item';
import styles from './notification-viewport.module.scss';
export function NotificationViewport({
  notifications,
  dismiss,
}: {
  notifications: Notification[];
  dismiss: (id: string) => void;
}) {
  const [host, setHost] = useState<Element>(document.body);
  const [headerBottom, setHeaderBottom] = useState(0);
  useLayoutEffect(() => {
    let header: HTMLElement | null = null;
    const position = () =>
      setHeaderBottom(Math.max(0, header?.getBoundingClientRect().bottom ?? 0));
    const resize = new ResizeObserver(position);
    const update = () => {
      setHost(Array.from(document.querySelectorAll('dialog:modal')).at(-1) ?? document.body);
      const current = document.querySelector<HTMLElement>('[data-site-header]');
      if (current !== header) {
        if (header) resize.unobserve(header);
        header = current;
        if (header) resize.observe(header);
      }
      position();
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['open'],
    });
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, { capture: true, passive: true });
    return () => {
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, []);
  return createPortal(
    <section
      className={styles.viewport}
      aria-label="Notifications"
      style={
        {
          '--notification-header-bottom': `${headerBottom}px`,
          '--notification-transition': `${NOTIFICATION_TRANSITION}ms`,
        } as CSSProperties
      }
    >
      {notifications.map((notification) => (
        <NotificationItem
          key={`${notification.id}-${notification.sequence}`}
          notification={notification}
          dismiss={dismiss}
        />
      ))}
    </section>,
    host,
  );
}
