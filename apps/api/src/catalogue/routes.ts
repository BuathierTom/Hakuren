import { registerPortraitRoutes } from './portrait-routes.js';
import type { FastifyInstance } from 'fastify';
import type {
  PlayerQuery,
  TechniqueQuery,
  ItemQuery,
  ItemSection,
  PassiveQuery,
  HistoricalTeamQuery,
} from '../../../../shared/catalogue.js';
import type { CatalogueRepository } from './repository.js';

const elements = ['wind', 'forest', 'fire', 'mountain', 'void'];
const common = {
  q: { type: 'string', maxLength: 100 },
  work: { type: 'string', pattern: '^[A-Z0-9_]+$', maxLength: 32 },
  element: { type: 'string', enum: elements },
  page: { type: 'integer', minimum: 1, maximum: 1000, default: 1 },
  limit: { type: 'integer', minimum: 1, maximum: 48, default: 24 },
};
const id = { type: 'integer', minimum: 1, maximum: 4_294_967_295 };

export function registerCatalogueRoutes(app: FastifyInstance, catalogue?: CatalogueRepository) {
  app.addHook('onRequest', async (request, reply) => {
    if (
      /^\/api\/(?:catalogue|players|techniques|equipment|tactics|passives|teams)(?:\/|\?|$)/.test(
        request.url,
      ) &&
      !catalogue
    ) {
      return reply.code(503).send({
        error: 'CATALOGUE_UNAVAILABLE',
        message: 'Le catalogue est momentanément indisponible.',
      });
    }
  });
  registerPortraitRoutes(app, catalogue);
  for (const section of ['equipment', 'tactics'] as ItemSection[]) {
    app.get<{ Querystring: ItemQuery }>(
      `/api/${section}`,
      {
        schema: {
          querystring: {
            type: 'object',
            additionalProperties: false,
            properties: {
              q: common.q,
              page: common.page,
              limit: common.limit,
              ...(section === 'equipment'
                ? { slot: { type: 'string', enum: ['boots', 'bracelet', 'pendant', 'accessory'] } }
                : {}),
            },
          },
        },
      },
      async (request, reply) => {
        if (!catalogue?.items)
          return reply.code(503).send({
            error: 'CATALOGUE_UNAVAILABLE',
            message: 'Le catalogue est momentanément indisponible.',
          });
        return catalogue.items(section, request.query);
      },
    );
    app.get<{ Params: { id: number } }>(
      `/api/${section}/:id`,
      {
        schema: {
          params: {
            type: 'object',
            required: ['id'],
            additionalProperties: false,
            properties: { id },
          },
        },
      },
      async (request, reply) => {
        const item = await catalogue?.item?.(section, request.params.id);
        return (
          item ??
          reply.code(404).send({ error: 'ITEM_NOT_FOUND', message: 'Cette fiche est introuvable.' })
        );
      },
    );
  }
  app.get(
    '/api/catalogue/loadouts',
    { schema: { querystring: { type: 'object', additionalProperties: false, properties: {} } } },
    async (_request, reply) => {
      if (!catalogue?.loadouts)
        return reply.code(503).send({
          error: 'CATALOGUE_UNAVAILABLE',
          message: 'Le catalogue est momentanément indisponible.',
        });
      return catalogue.loadouts();
    },
  );
  app.get<{ Querystring: PassiveQuery }>(
    '/api/passives',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            q: common.q,
            page: common.page,
            limit: common.limit,
            source: { type: 'string', enum: ['player', 'custom', 'coach', 'manager'] },
            style: {
              type: 'string',
              enum: ['breach', 'tension', 'counter', 'bond', 'rough_play', 'justice'],
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!catalogue?.passives)
        return reply.code(503).send({
          error: 'CATALOGUE_UNAVAILABLE',
          message: 'Le catalogue est momentanément indisponible.',
        });
      return catalogue.passives(request.query);
    },
  );
  app.get<{ Querystring: HistoricalTeamQuery }>(
    '/api/teams',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: { q: common.q, work: common.work, page: common.page, limit: common.limit },
        },
      },
    },
    async (request, reply) => {
      if (!catalogue?.teams)
        return reply.code(503).send({
          error: 'CATALOGUE_UNAVAILABLE',
          message: 'Le catalogue est momentanément indisponible.',
        });
      return catalogue.teams(request.query);
    },
  );
  for (const section of ['passives', 'teams'] as const)
    app.get<{ Params: { id: number } }>(
      `/api/${section}/:id`,
      {
        schema: {
          params: {
            type: 'object',
            additionalProperties: false,
            required: ['id'],
            properties: { id },
          },
        },
      },
      async (request, reply) => {
        const method = section === 'passives' ? catalogue?.passive : catalogue?.team;
        if (!method)
          return reply.code(503).send({
            error: 'CATALOGUE_UNAVAILABLE',
            message: 'Le catalogue est momentanément indisponible.',
          });
        return (
          (await method(request.params.id)) ??
          reply.code(404).send({ error: 'ITEM_NOT_FOUND', message: 'Cette fiche est introuvable.' })
        );
      },
    );
  app.get(
    '/api/catalogue',
    { schema: { querystring: { type: 'object', additionalProperties: false, properties: {} } } },
    async (_request, reply) => {
      reply.header('Cache-Control', 'no-store');
      return catalogue!.filters();
    },
  );
  app.get<{ Querystring: PlayerQuery }>(
    '/api/players',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ...common,
            position: { type: 'string', enum: ['GK', 'DF', 'MF', 'FW'] },
            gender: { type: 'string', enum: ['male', 'female', 'neutral'] },
            style: {
              type: 'string',
              enum: ['breach', 'tension', 'counter', 'bond', 'rough_play', 'justice'],
            },
            rarity: { type: 'string', pattern: '^[a-z0-9-]+$', maxLength: 32 },
            eligibility: { type: 'string', enum: ['player', 'coach', 'manager'] },
            role: { type: 'string', enum: ['player', 'staff', 'manager', 'coordinator'] },
            technique: id,
            sort: { type: 'string', enum: ['number', 'name'], default: 'name' },
          },
        },
      },
    },
    async (request) => catalogue!.players(request.query),
  );
  app.get<{ Params: { id: number } }>(
    '/api/players/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          additionalProperties: false,
          properties: { id },
        },
      },
    },
    async (request, reply) => {
      const player = await catalogue!.player(request.params.id);
      return (
        player ??
        reply.code(404).send({ error: 'PLAYER_NOT_FOUND', message: 'Ce joueur est introuvable.' })
      );
    },
  );
  app.get<{ Querystring: TechniqueQuery }>(
    '/api/techniques',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ...common,
            category: {
              type: 'string',
              enum: [
                'shoot',
                'dribble',
                'block',
                'catch',
                'keshin',
                'keshin_armed',
                'miximax',
                'totem',
                'bond_transform',
                'awakening_power',
                'mode_change',
                'awakening_change',
                'tactic',
                'passive',
                'other',
                'unknown',
              ],
            },
          },
        },
      },
    },
    async (request) => catalogue!.techniques(request.query),
  );
  app.get<{ Params: { id: number } }>(
    '/api/techniques/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          additionalProperties: false,
          properties: { id },
        },
      },
    },
    async (request, reply) => {
      const technique = await catalogue!.technique(request.params.id);
      return (
        technique ??
        reply
          .code(404)
          .send({ error: 'TECHNIQUE_NOT_FOUND', message: 'Cette technique est introuvable.' })
      );
    },
  );
}
