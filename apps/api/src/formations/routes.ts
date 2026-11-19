import type { FastifyInstance } from 'fastify';
import type { FormationRepository } from './repository.js';
export function registerFormationRoutes(app: FastifyInstance, formations?: FormationRepository) {
  app.get(
    '/api/formations',
    { schema: { querystring: { type: 'object', additionalProperties: false, properties: {} } } },
    async (_request, reply) => {
      if (!formations)
        return reply.code(503).send({
          error: 'FORMATIONS_UNAVAILABLE',
          message: 'Les formations sont momentanément indisponibles.',
        });
      return { items: await formations.list() };
    },
  );
}
