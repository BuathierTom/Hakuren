import Fastify from 'fastify';
import type { Database } from './db/client.js';

export interface AppOptions {
  database?: Database;
  logger?: boolean;
}

/** Application factory: requests can be tested without opening a network port. */
export function buildApp({ database, logger = false }: AppOptions = {}) {
  const app = Fastify({
    bodyLimit: 1_048_576,
    logger: logger ? {
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      serializers: {
        req(request) {
          return { method: request.method, url: request.url?.split('?')[0], hostname: request.hostname };
        },
      },
    } : false,
  });

  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
  });

  app.get('/api/health', async () => ({ status: 'ok', service: 'kizunadex-api' }));

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

  app.addHook('onClose', async () => { await database?.close(); });
  return app;
}
