import { createContext, useContext } from 'react';
import type { AuthSession } from '@shared/auth';
export interface AuthContextValue extends AuthSession {
  loading: boolean;
  signingOut: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}
export const AuthContext = createContext<AuthContextValue | null>(null);
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('Contexte de connexion manquant.');
  return context;
}
