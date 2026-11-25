import type { FastifyInstance } from 'fastify';
import type { CatalogueRepository } from './repository.js';
import { loadPortrait, type PortraitImage } from './portrait.js';

export function registerPortraitRoutes(
  app: FastifyInstance,
  catalogue?: Pick<CatalogueRepository, 'portrait'>,
  load: typeof loadPortrait = loadPortrait,
) {
  const cache = new Map<string, { image: PortraitImage; expiresAt: number }>();
  app.get<{ Params: { id: number } }>(
    '/api/players/:id/portrait',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          additionalProperties: false,
          properties: { id: { type: 'integer', minimum: 1, maximum: 4_294_967_295 } },
        },
      },
    },
    async (request, reply) => {
      if (!catalogue?.portrait)
        return reply.code(503).send({
          error: 'PORTRAIT_UNAVAILABLE',
          message: 'Les portraits sont momentanément indisponibles.',
        });
      const source = await catalogue.portrait(request.params.id);
      if (!source)
        return reply
          .code(404)
          .send({ error: 'PORTRAIT_NOT_FOUND', message: 'Ce portrait est indisponible.' });
      try {
        const cached = cache.get(source);
        const image = cached && cached.expiresAt > Date.now() ? cached.image : await load(source);
        if (image !== cached?.image) {
          cache.delete(source);
          if (cache.size >= 32) cache.delete(cache.keys().next().value!);
          cache.set(source, { image, expiresAt: Date.now() + 300_000 });
        }
        return reply.type(image.contentType).send(image.data);
      } catch {
        return reply.code(503).send({
          error: 'PORTRAIT_UNAVAILABLE',
          message: 'Le portrait ne peut pas être chargé pour le moment.',
        });
      }
    },
  );
}
