export interface AuthUser {
  id: number;
  discordId: string;
  displayName: string;
  avatarUrl: string | null;
}
export interface AuthSession {
  user: AuthUser | null;
  configured: boolean;
  loginUrl: string;
}
