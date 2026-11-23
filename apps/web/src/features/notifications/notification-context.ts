import { createContext, useContext } from 'react';
export interface NotificationOptions {
  id?: string;
  message: string;
  tone?: 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
}
export interface Notification extends NotificationOptions {
  id: string;
  sequence: number;
  createdAt: number;
  closing?: boolean;
}
export interface NotificationContextValue {
  notify: (options: NotificationOptions) => string;
  dismiss: (id: string) => void;
}
export const NotificationContext = createContext<NotificationContextValue | null>(null);
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('Contexte des notifications manquant.');
  return context;
}
