import type { AuthUser } from '../../../../shared/auth.js';
import type { AuthRepository, LoginState } from '../../src/auth/repository.js';
import type { DiscordProfile } from '../../src/auth/discord.js';
import { getAuthConfig } from '../../src/auth/config.js';
export const authConfig = getAuthConfig({
  APP_URL: 'http://localhost:5177',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'server-only-test-secret',
});
export const discordUser: DiscordProfile = {
  discordId: '234567890123456789',
  displayName: 'Hakuren Tester',
  avatarUrl: null,
};
export function memoryAuth() {
  const states = new Map<string, LoginState & { browserHash: string }>();
  const sessions = new Map<string, AuthUser>();
  const users = new Map<string, AuthUser>();
  const repository: AuthRepository = {
    async createState(key, browserHash, state) {
      states.set(key, { ...state, browserHash });
    },
    async consumeState(key, browserHash) {
      const state = states.get(key);
      if (!state || state.browserHash !== browserHash) return null;
      states.delete(key);
      return { verifier: state.verifier, returnTo: state.returnTo };
    },
    async signIn(profile, sessionHash, previousHash) {
      const user = { ...profile, id: users.get(profile.discordId)?.id ?? users.size + 1 };
      users.set(profile.discordId, user);
      if (previousHash) sessions.delete(previousHash);
      sessions.set(sessionHash, user);
      return user;
    },
    async session(key) {
      return sessions.get(key) ?? null;
    },
    async signOut(key) {
      sessions.delete(key);
    },
  };
  return { repository, states, sessions, users };
}
export function cookieHeader(response: { headers: Record<string, unknown> }, name: string) {
  const raw = response.headers['set-cookie'];
  const headers = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return (
    headers
      .map(String)
      .find((header) => header.startsWith(`${name}=`))
      ?.split(';')[0] ?? ''
  );
}
