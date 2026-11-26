import { t } from '@/features/preferences/lib/i18n';
import { clearDeletedAccount } from './lib/deleted-account';
import { useNotifications } from '@/features/notifications/notification-context';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AuthSession } from '@shared/auth';
import { AuthContext } from './auth-context';
export function AuthProvider({ children }: { children: ReactNode }) {
  const { notify } = useNotifications();
  const [session, setSession] = useState<AuthSession>({
    user: null,
    configured: false,
    loginUrl: '/api/auth/discord',
  });
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  const logoutActive = useRef(false);
  const refresh = useCallback(async () => {
    if (logoutActive.current) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Session indisponible');
      const data = (await response.json()) as AuthSession;
      if (!controller.signal.aborted) {
        setSession(data);
        setError(null);
      }
    } catch {
      if (!controller.signal.aborted) setError(t('La connexion est momentanément indisponible.'));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const focus = () => {
      void refresh();
    };
    window.addEventListener('focus', focus);
    window.addEventListener('pageshow', focus);
    return () => {
      pending.current?.abort();
      window.removeEventListener('focus', focus);
      window.removeEventListener('pageshow', focus);
    };
  }, [refresh]);
  const signOut = useCallback(async () => {
    if (logoutActive.current) return;
    logoutActive.current = true;
    setSigningOut(true);
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Déconnexion indisponible');
      setSession((current) => ({ ...current, user: null }));
      notify({ message: t('Tu es déconnecté de ton compte Hakuren.'), tone: 'info' });
      setError(null);
      setLoading(false);
    } catch {
      if (!controller.signal.aborted) setError(t('Impossible de se déconnecter pour le moment.'));
    } finally {
      logoutActive.current = false;
      if (!controller.signal.aborted) setSigningOut(false);
    }
  }, [notify]);
  const deleteAccount = useCallback(async () => {
    const userId = session.user?.id;
    if (!userId || logoutActive.current) return false;
    logoutActive.current = true;
    setDeletingAccount(true);
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    try {
      const response = await fetch('/api/me/account', {
        method: 'DELETE',
        credentials: 'same-origin',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-Hakuren-Account': String(userId) },
        body: JSON.stringify({ confirm: true }),
      });
      if (!response.ok) {
        const failure = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(failure?.message ?? t('Impossible de supprimer le compte pour le moment.'));
      }
      try {
        clearDeletedAccount(window.localStorage, userId);
      } catch {}
      setSession((current) => (current.user?.id === userId ? { ...current, user: null } : current));
      setError(null);
      setLoading(false);
      notify({ message: t('Ton compte Hakuren a été supprimé.'), tone: 'success' });
      return true;
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : t('Impossible de supprimer le compte pour le moment.'),
        );
      return false;
    } finally {
      logoutActive.current = false;
      if (!controller.signal.aborted) setDeletingAccount(false);
    }
  }, [session.user?.id, notify]);
  return (
    <AuthContext
      value={{
        ...session,
        loading,
        signingOut,
        deletingAccount,
        deleteAccount,
        error,
        refresh,
        signOut,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext>
  );
}
