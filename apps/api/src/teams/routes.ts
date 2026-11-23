import type { FastifyInstance } from 'fastify';
import type { Team } from '../../../../shared/teams.js';
import type { AuthOptions } from '../auth/routes.js';
import { hash, validToken } from '../auth/security.js';
import { TeamError } from './errors.js';
import type { TeamRepository } from './repository.js';
import { writeSchema, paramsSchema, deleteSchema, validateTeam } from './schema.js';
export function registerTeamRoutes(
  app: FastifyInstance,
  auth: AuthOptions,
  teams?: TeamRepository,
) {
  app.register(async (routes) => {
    routes.decorateRequest('teamUserId', 0);
    routes.addHook('onRequest', async (request, reply) => {
      if (!auth.repository || !teams)
        return reply.code(503).send({
          error: 'TEAMS_UNAVAILABLE',
          message: 'Les équipes du compte sont momentanément indisponibles.',
        });
      if (
        !['GET', 'HEAD'].includes(request.method) &&
        request.headers.origin !== auth.config.appUrl
      )
        return reply.code(403).send({
          error: 'INVALID_ORIGIN',
          message: 'Cette demande de modification est invalide.',
        });
      const name = auth.config.appUrl.startsWith('https:')
        ? '__Host-hakuren_session'
        : 'hakuren_session';
      const raw = request.cookies[name];
      const user = validToken(raw) ? await auth.repository.session(hash(raw)) : null;
      if (!user)
        return reply
          .code(401)
          .send({ error: 'LOGIN_REQUIRED', message: 'Connecte-toi pour retrouver tes équipes.' });
      if (request.headers['x-hakuren-account'] !== String(user.id))
        return reply.code(409).send({
          error: 'ACCOUNT_CHANGED',
          message: 'Le compte connecté a changé. Recharge la page pour continuer.',
        });
      request.teamUserId = user.id;
    });
    routes.setErrorHandler((error, request, reply) => {
      if (error instanceof TeamError)
        return reply.code(error.status).send({ error: error.code, message: error.message });
      if (typeof error === 'object' && error !== null && 'validation' in error)
        return reply
          .code(400)
          .send({ error: 'INVALID_TEAM', message: 'Les données de cette équipe sont invalides.' });
      request.log.error({ code: 'TEAMS_UNAVAILABLE' }, 'Account teams request failed');
      return reply.code(503).send({
        error: 'TEAMS_UNAVAILABLE',
        message: 'Impossible de sauvegarder ou de charger les équipes du compte pour le moment.',
      });
    });
    const querystring = { type: 'object', properties: {}, additionalProperties: false };
    routes.get('/api/me/teams', { schema: { querystring } }, async (request) => ({
      items: await teams!.list(request.teamUserId),
    }));
    routes.get('/api/me/team-draft', { schema: { querystring } }, async (request) => ({
      draft: await teams!.draft(request.teamUserId),
    }));
    routes.put<{ Params: { id: string }; Body: { team: Team; revision: number | null } }>(
      '/api/me/teams/:id',
      { bodyLimit: 131072, schema: { querystring, params: paramsSchema, body: writeSchema } },
      async (request, reply) => {
        if (request.params.id !== request.body.team.id)
          throw new TeamError(400, 'INVALID_TEAM', 'L’identifiant de cette équipe est invalide.');
        validateTeam(request.body.team);
        const saved = await teams!.save(
          request.teamUserId,
          request.body.team,
          request.body.revision,
        );
        return reply.code(request.body.revision === null ? 201 : 200).send(saved);
      },
    );
    routes.put<{ Body: { team: Team; revision: number | null } }>(
      '/api/me/team-draft',
      { bodyLimit: 131072, schema: { querystring, body: writeSchema } },
      async (request) => {
        validateTeam(request.body.team, true);
        return teams!.save(request.teamUserId, request.body.team, request.body.revision, true);
      },
    );
    routes.delete<{ Params: { id: string }; Body: { revision: number } }>(
      '/api/me/teams/:id',
      { bodyLimit: 1024, schema: { querystring, params: paramsSchema, body: deleteSchema } },
      async (request, reply) => {
        await teams!.remove(request.teamUserId, request.params.id, request.body.revision);
        return reply.code(204).send();
      },
    );
  });
}
declare module 'fastify' {
  interface FastifyRequest {
    teamUserId: number;
  }
}
