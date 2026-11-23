import { NOTIFICATION_TRANSITION } from './notification-timing';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  NotificationContext,
  type Notification,
  type NotificationOptions,
} from './notification-context';
import { NotificationViewport } from './components/notification-viewport/notification-viewport';
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const sequence = useRef(0);
  const timers = useRef(new Map<string, number>());
  const dismiss = useCallback((id: string) => {
    setNotifications((current) => {
      if (!current.some((notification) => notification.id === id && !notification.closing))
        return current;
      return current.map((notification) =>
        notification.id === id ? { ...notification, closing: true } : notification,
      );
    });
  }, []);
  const notify = useCallback((options: NotificationOptions) => {
    const id = options.id ?? `${options.tone ?? 'info'}:${options.message}`;
    const next = { ...options, id, sequence: ++sequence.current, createdAt: Date.now() };
    setNotifications((current) => {
      const existing = current.find((notification) => notification.id === id);
      if (
        options.id &&
        existing &&
        !existing.closing &&
        existing.message === options.message &&
        existing.tone === options.tone &&
        existing.action?.label === options.action?.label
      )
        return current;
      return [next, ...current.filter((notification) => notification.id !== id)].slice(0, 4);
    });
    return id;
  }, []);
  useEffect(() => {
    const active = new Set(
      notifications.map((notification) => `${notification.id}:${notification.sequence}`),
    );
    for (const [key, timer] of timers.current) {
      if (!active.has(key)) {
        window.clearTimeout(timer);
        timers.current.delete(key);
      }
    }
    for (const notification of notifications) {
      const key = `${notification.id}:${notification.sequence}`;
      if (!notification.closing || timers.current.has(key)) continue;
      timers.current.set(
        key,
        window.setTimeout(() => {
          timers.current.delete(key);
          setNotifications((current) =>
            current.filter(
              (item) => item.id !== notification.id || item.sequence !== notification.sequence,
            ),
          );
        }, NOTIFICATION_TRANSITION),
      );
    }
  }, [notifications]);
  useEffect(
    () => () => {
      for (const timer of timers.current.values()) window.clearTimeout(timer);
      timers.current.clear();
    },
    [],
  );
  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);
  return (
    <NotificationContext value={value}>
      {children}
      <NotificationViewport notifications={notifications} dismiss={dismiss} />
    </NotificationContext>
  );
}
