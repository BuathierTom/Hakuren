import { href, navigate, useLocation } from '@/app/navigation';
import { useEffect } from 'react';
import { useNotifications } from '@/features/notifications/notification-context';
import { useAuth } from '../../auth-context';
const messages: Record<string, string> = {
  cancelled: 'La connexion Discord a été annulée.',
  expired: 'La demande de connexion a expiré. Tu peux réessayer.',
  unconfigured: 'La connexion Discord est en cours de configuration.',
  unavailable: 'La connexion est momentanément indisponible.',
  failed: 'La connexion Discord a échoué. Tu peux réessayer.',
};
export function AuthNotice() {
  const { error, clearError } = useAuth();
  const { notify } = useNotifications();
  const { view, params } = useLocation();
  const code = params.get('auth_error');
  useEffect(() => {
    if (error) {
      notify({ id: 'auth-error', message: error, tone: 'error' });
      clearError();
    }
    if (code && messages[code]) {
      notify({
        id: `auth-callback-${code}`,
        message: messages[code],
        tone: code === 'cancelled' ? 'info' : 'error',
      });
      navigate(href(view, { auth_error: null }), { replace: true });
    }
  }, [error, code, view, notify, clearError]);
  return null;
}
