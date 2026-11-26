import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthOptions } from './routes.js';
import { hash, validToken } from './security.js';

export async function accountUser(request: FastifyRequest, reply: FastifyReply, auth: AuthOptions) {
  if (!auth.repository) {
    reply
      .code(503)
      .send({ error: 'ACCOUNT_UNAVAILABLE', message: 'Le compte est momentanément indisponible.' });
    return null;
  }
  if (!['GET', 'HEAD'].includes(request.method) && request.headers.origin !== auth.config.appUrl) {
    reply
      .code(403)
      .send({ error: 'INVALID_ORIGIN', message: 'Cette demande de modification est invalide.' });
    return null;
  }
  const name = auth.config.appUrl.startsWith('https:')
    ? '__Host-hakuren_session'
    : 'hakuren_session';
  const raw = request.cookies[name];
  const user = validToken(raw) ? await auth.repository.session(hash(raw)) : null;
  if (!user) {
    reply
      .code(401)
      .send({ error: 'LOGIN_REQUIRED', message: 'Connecte-toi pour accéder à ton compte.' });
    return null;
  }
  if (request.headers['x-hakuren-account'] !== String(user.id)) {
    reply
      .code(409)
      .send({
        error: 'ACCOUNT_CHANGED',
        message: 'Le compte connecté a changé. Recharge la page pour continuer.',
      });
    return null;
  }
  return user;
}
