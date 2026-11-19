import Fastify from 'fastify';
import type { Database } from './db/client.js';
import { registerCatalogueRoutes } from './catalogue/routes.js';
import type { CatalogueRepository } from './catalogue/repository.js';

import { registerFormationRoutes } from './formations/routes.js';
import type { FormationRepository } from './formations/repository.js';

export interface AppOptions {
  database?: Database;
  catalogue?: CatalogueRepository;
  formations?: FormationRepository;
  logger?: boolean;
}
export function buildApp({ database, catalogue, formations, logger = false }: AppOptions = {}) {
  const app = Fastify({
    bodyLimit: 1_048_576,
    ajv: { customOptions: { removeAdditional: false } },
    logger: logger
      ? {
          redact: ['req.headers.authorization', 'req.headers.cookie'],
          serializers: {
            req(request) {
              return {
                method: request.method,
                url: request.url?.split('?')[0],
                hostname: request.hostname,
              };
            },
          },
        }
      : false,
  });

  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Cache-Control', 'no-store');
  });

  app.setErrorHandler((error, request, reply) => {
    const details = typeof error === 'object' && error !== null ? error : null;
    if (details && 'validation' in details)
      return reply
        .code(400)
        .send({ error: 'INVALID_REQUEST', message: 'Les paramètres de recherche sont invalides.' });
    const code =
      details && 'code' in details && typeof details.code === 'string' ? details.code : undefined;
    request.log.error({ code, requestId: request.id }, 'Catalogue request failed');
    return reply.code(503).send({
      error: 'CATALOGUE_UNAVAILABLE',
      message: 'Le catalogue est momentanément indisponible.',
    });
  });

  app.get('/api/health', async () => ({ status: 'ok', service: 'hakuren-api' }));

  app.get('/api/ready', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (!database) {
      return reply.code(503).send({ status: 'not-ready', database: 'not-configured' });
    }
    try {
      await database.check();
      return { status: 'ready', database: 'connected' };
    } catch {
      return reply.code(503).send({ status: 'not-ready', database: 'unavailable' });
    }
  });

  registerCatalogueRoutes(app, catalogue);
  registerFormationRoutes(app, formations);
  app.addHook('onClose', async () => {
    await database?.close();
  });
  return app;
}
