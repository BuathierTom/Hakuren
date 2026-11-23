import type { AuthConfig } from './config.js';
import { authCallback } from './config.js';
export interface DiscordProfile {
  discordId: string;
  displayName: string;
  avatarUrl: string | null;
}
export interface DiscordClient {
  identify(code: string, verifier: string): Promise<DiscordProfile>;
}
export function discordProfile(value: unknown): DiscordProfile {
  if (!value || typeof value !== 'object') throw new Error('Profil Discord invalide.');
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== 'string' ||
    !/^\d{17,20}$/.test(row.id) ||
    typeof row.username !== 'string' ||
    !row.username.trim() ||
    row.username.length > 120 ||
    row.bot === true
  )
    throw new Error('Profil Discord invalide.');
  const displayName =
    typeof row.global_name === 'string' && row.global_name.trim()
      ? row.global_name.trim()
      : row.username.trim();
  if (displayName.length > 120) throw new Error('Profil Discord invalide.');
  const avatar =
    typeof row.avatar === 'string' && /^(?:a_)?[a-f0-9]{32}$/.test(row.avatar) ? row.avatar : null;
  return {
    discordId: row.id,
    displayName,
    avatarUrl: avatar ? `https://cdn.discordapp.com/avatars/${row.id}/${avatar}.png?size=64` : null,
  };
}
export function createDiscordClient(
  config: AuthConfig,
  request: typeof fetch = fetch,
): DiscordClient {
  return {
    async identify(code, verifier) {
      if (!config.discord) throw new Error('Discord non configuré.');
      const response = await request('https://discord.com/api/oauth2/token', {
        method: 'POST',
        redirect: 'error',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          client_id: config.discord.clientId,
          client_secret: config.discord.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: authCallback(config),
          code_verifier: verifier,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Connexion Discord indisponible.');
      const data = (await response.json()) as Record<string, unknown>;
      if (
        typeof data.access_token !== 'string' ||
        !data.access_token ||
        data.access_token.length > 4096 ||
        typeof data.token_type !== 'string' ||
        data.token_type.toLowerCase() !== 'bearer' ||
        typeof data.scope !== 'string' ||
        !data.scope.split(/\s+/).includes('identify')
      )
        throw new Error('Réponse Discord invalide.');
      const user = await request('https://discord.com/api/v10/users/@me', {
        redirect: 'error',
        headers: { Authorization: `Bearer ${data.access_token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!user.ok) throw new Error('Profil Discord indisponible.');
      return discordProfile(await user.json());
    },
  };
}
