import type { FastifyInstance } from 'fastify';
import type { FavoriteKind } from '../../../../shared/favorites.js';
import { accountUser } from '../auth/account.js';
import type { AuthOptions } from '../auth/routes.js';
import { FavoriteError } from './errors.js';
import type { FavoriteRepository } from './repository.js';

const kinds = ['players', 'techniques', 'equipment', 'tactics', 'teams'];
const id = {
  type: 'string',
  pattern: '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$',
};
const empty = { type: 'object', properties: {}, additionalProperties: false };
const params = {
  type: 'object',
  required: ['id'],
  properties: { id },
  additionalProperties: false,
};
export function registerFavoriteRoutes(
  app: FastifyInstance,
  auth: AuthOptions,
  favorites?: FavoriteRepository,
) {
  app.register(async (routes) => {
    routes.decorateRequest('favoriteUserId', 0);
    routes.addHook('onRequest', async (request, reply) => {
      if (!favorites)
        return reply.code(503).send({
          error: 'FAVORITES_UNAVAILABLE',
          message: 'Les favoris sont momentanément indisponibles.',
        });
      const user = await accountUser(request, reply, auth);
      if (user) request.favoriteUserId = user.id;
    });
    routes.setErrorHandler((error, request, reply) => {
      if (error instanceof FavoriteError)
        return reply.code(error.status).send({ error: error.code, message: error.message });
      if (typeof error === 'object' && error !== null && 'validation' in error)
        return reply
          .code(400)
          .send({ error: 'INVALID_FAVORITE', message: 'Les données de ce favori sont invalides.' });
      request.log.error({ code: 'FAVORITES_UNAVAILABLE' }, 'Account favorites request failed');
      return reply.code(503).send({
        error: 'FAVORITES_UNAVAILABLE',
        message: 'Les favoris sont momentanément indisponibles.',
      });
    });
    routes.get('/api/me/favorites', { schema: { querystring: empty } }, (request) =>
      favorites!.state(request.favoriteUserId),
    );
    routes.post<{ Body: { name: string } }>(
      '/api/me/favorite-playlists',
      {
        bodyLimit: 1024,
        schema: {
          querystring: empty,
          body: {
            type: 'object',
            additionalProperties: false,
            required: ['name'],
            properties: { name: { type: 'string', minLength: 1, maxLength: 80 } },
          },
        },
      },
      async (request, reply) =>
        reply.code(201).send(await favorites!.create(request.favoriteUserId, request.body.name)),
    );
    routes.delete<{ Params: { id: string } }>(
      '/api/me/favorite-playlists/:id',
      { schema: { querystring: empty, params } },
      (request) => favorites!.remove(request.favoriteUserId, request.params.id),
    );
    routes.get<{ Params: { id: string }; Querystring: { kind: FavoriteKind; page?: number } }>(
      '/api/me/favorite-playlists/:id/entries',
      {
        schema: {
          params,
          querystring: {
            type: 'object',
            required: ['kind'],
            additionalProperties: false,
            properties: {
              kind: { type: 'string', enum: kinds },
              page: { type: 'integer', minimum: 1, maximum: 10000 },
            },
          },
        },
      },
      (request) =>
        favorites!.entries(
          request.favoriteUserId,
          request.params.id,
          request.query.kind,
          request.query.page ?? 1,
        ),
    );
    const entryParams = {
      type: 'object',
      required: ['id', 'kind', 'targetId'],
      additionalProperties: false,
      properties: {
        id,
        kind: { type: 'string', enum: kinds },
        targetId: { type: 'integer', minimum: 1, maximum: 4294967295 },
      },
    };
    for (const method of ['PUT', 'DELETE'] as const)
      routes.route<{ Params: { id: string; kind: FavoriteKind; targetId: number } }>({
        method,
        url: '/api/me/favorite-playlists/:id/entries/:kind/:targetId',
        schema: { querystring: empty, params: entryParams },
        handler: (request) =>
          favorites!.set(
            request.favoriteUserId,
            request.params.id,
            request.params.kind,
            request.params.targetId,
            method === 'PUT',
          ),
      });
  });
}
declare module 'fastify' {
  interface FastifyRequest {
    favoriteUserId: number;
  }
}
