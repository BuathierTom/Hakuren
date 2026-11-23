import type { FastifyInstance } from 'fastify';
import type { AuthConfig } from './config.js';
import { authCallback } from './config.js';
import { createDiscordClient, type DiscordClient } from './discord.js';
import type { AuthRepository } from './repository.js';
import {
  challenge,
  hash,
  returnPath,
  token,
  validToken,
  SESSION_SECONDS,
  STATE_SECONDS,
} from './security.js';
export interface AuthOptions {
  config: AuthConfig;
  repository?: AuthRepository;
  discord?: DiscordClient;
}
export function registerAuthRoutes(
  app: FastifyInstance,
  { config, repository, discord = createDiscordClient(config) }: AuthOptions,
) {
  const secure = config.appUrl.startsWith('https:');
  const sessionCookie = secure ? '__Host-hakuren_session' : 'hakuren_session';
  const browserCookie = secure ? '__Host-hakuren_oauth' : 'hakuren_oauth';
  const cookie = { path: '/', httpOnly: true, sameSite: 'lax' as const, secure };
  const configured = !!config.discord && !!repository;
  const failure = (path: string, reason: string) => {
    const url = new URL(returnPath(path, config.appUrl), config.appUrl);
    url.searchParams.set('auth_error', reason);
    return url.href;
  };
  app.get(
    '/api/auth/session',
    { schema: { querystring: { type: 'object', additionalProperties: false, properties: {} } } },
    async (request, reply) => {
      reply.header('Referrer-Policy', 'no-referrer');
      const raw = request.cookies[sessionCookie];
      try {
        const user = repository && validToken(raw) ? await repository.session(hash(raw)) : null;
        if (raw && !user) reply.clearCookie(sessionCookie, cookie);
        return { user, configured, loginUrl: `${config.appUrl}/api/auth/discord` };
      } catch {
        return reply.code(503).send({
          error: 'AUTH_UNAVAILABLE',
          message: 'La connexion est momentanément indisponible.',
        });
      }
    },
  );
  app.get<{ Querystring: { returnTo?: string } }>(
    '/api/auth/discord',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: { returnTo: { type: 'string', maxLength: 1024 } },
        },
      },
    },
    async (request, reply) => {
      reply.header('Referrer-Policy', 'no-referrer');
      const path = returnPath(request.query.returnTo, config.appUrl);
      if (!configured) return reply.redirect(failure(path, 'unconfigured'));
      const state = token();
      const binding = token();
      const verifier = token();
      try {
        await repository!.createState(hash(state), hash(binding), { verifier, returnTo: path });
      } catch {
        return reply.redirect(failure(path, 'unavailable'));
      }
      const url = new URL('https://discord.com/oauth2/authorize');
      url.search = new URLSearchParams({
        client_id: config.discord!.clientId,
        response_type: 'code',
        scope: 'identify',
        redirect_uri: authCallback(config),
        state,
        code_challenge: challenge(verifier),
        code_challenge_method: 'S256',
      }).toString();
      reply.setCookie(browserCookie, binding, { ...cookie, maxAge: STATE_SECONDS });
      return reply.redirect(url.href);
    },
  );
  app.get<{ Querystring: { state?: string; code?: string; error?: string; iss?: string } }>(
    '/api/auth/discord/callback',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            state: { type: 'string', maxLength: 256 },
            code: { type: 'string', maxLength: 2048 },
            error: { type: 'string', maxLength: 100 },
            iss: { type: 'string', maxLength: 256 },
          },
        },
      },
    },
    async (request, reply) => {
      reply.header('Referrer-Policy', 'no-referrer');
      const binding = request.cookies[browserCookie];
      reply.clearCookie(browserCookie, cookie);
      if (!configured) return reply.redirect(failure('/', 'unconfigured'));
      const query = request.query;
      if (!validToken(query.state) || !validToken(binding))
        return reply.redirect(failure('/', 'expired'));
      let destination = '/';
      try {
        const state = await repository!.consumeState(hash(query.state), hash(binding));
        if (!state) return reply.redirect(failure('/', 'expired'));
        destination = returnPath(state.returnTo, config.appUrl);
        if (query.iss && query.iss !== 'https://discord.com')
          return reply.redirect(failure(destination, 'failed'));
        if (query.error)
          return reply.redirect(
            failure(destination, query.error === 'access_denied' ? 'cancelled' : 'failed'),
          );
        if (!query.code) return reply.redirect(failure(destination, 'failed'));
        const profile = await discord.identify(query.code, state.verifier);
        const raw = token();
        const previous = request.cookies[sessionCookie];
        await repository!.signIn(
          profile,
          hash(raw),
          validToken(previous) ? hash(previous) : undefined,
        );
        reply.setCookie(sessionCookie, raw, { ...cookie, maxAge: SESSION_SECONDS });
        return reply.redirect(new URL(destination, config.appUrl).href);
      } catch {
        request.log.warn({ code: 'DISCORD_LOGIN_FAILED' }, 'Discord sign-in failed');
        return reply.redirect(failure(destination, 'failed'));
      }
    },
  );
  app.post(
    '/api/auth/logout',
    {
      bodyLimit: 1024,
      schema: { body: { type: 'object', additionalProperties: false, properties: {} } },
    },
    async (request, reply) => {
      if (request.headers.origin !== config.appUrl)
        return reply
          .code(403)
          .send({ error: 'INVALID_ORIGIN', message: 'Cette demande de déconnexion est invalide.' });
      const raw = request.cookies[sessionCookie];
      try {
        if (repository && validToken(raw)) await repository.signOut(hash(raw));
      } catch {
        return reply.code(503).send({
          error: 'AUTH_UNAVAILABLE',
          message: 'La déconnexion est momentanément indisponible.',
        });
      }
      reply.clearCookie(sessionCookie, cookie);
      return reply.code(204).send();
    },
  );
}
