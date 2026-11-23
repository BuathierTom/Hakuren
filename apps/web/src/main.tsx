import { NotificationProvider } from '@/features/notifications/notification-provider';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/app';
import { AuthProvider } from '@/features/auth/auth-provider';
import './styles/global.scss';

const root = document.getElementById('root');
if (!root) throw new Error('Élément racine introuvable.');
createRoot(root).render(
  <StrictMode>
    <NotificationProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </NotificationProvider>
  </StrictMode>,
);
