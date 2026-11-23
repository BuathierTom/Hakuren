export interface AuthConfig {
  appUrl: string;
  discord?: { clientId: string; clientSecret: string };
}
export function getAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const frontPort = Number(env.FRONT_PORT ?? 5173);
  if (!Number.isInteger(frontPort) || frontPort < 1 || frontPort > 65535)
    throw new Error('FRONT_PORT doit être un port valide.');
  const app = new URL(env.APP_URL?.trim() || `http://localhost:${frontPort}`);
  if (
    !['http:', 'https:'].includes(app.protocol) ||
    app.username ||
    app.password ||
    app.pathname !== '/' ||
    app.search ||
    app.hash
  )
    throw new Error('APP_URL doit contenir uniquement l’origine du frontend.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(app.hostname);
  if (app.protocol !== 'https:' && (env.NODE_ENV === 'production' || !local))
    throw new Error('APP_URL doit utiliser HTTPS hors développement local.');
  const clientId = env.DISCORD_CLIENT_ID?.trim() || '';
  const clientSecret = env.DISCORD_CLIENT_SECRET?.trim() || '';
  if (clientId && !/^\d{17,20}$/.test(clientId))
    throw new Error('DISCORD_CLIENT_ID doit être l’identifiant de l’application Discord.');
  return {
    appUrl: app.origin,
    discord: clientId && clientSecret ? { clientId, clientSecret } : undefined,
  };
}
export const authCallback = (config: AuthConfig) => `${config.appUrl}/api/auth/discord/callback`;
