import type { Team } from '../../../../shared/teams.js';
import { TeamError } from './errors.js';
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required,
});
const id = { type: 'integer', minimum: 1, maximum: 4294967295 };
const nullable = (schema: object) => ({ anyOf: [schema, { type: 'null' }] });
const string = (maxLength: number) => ({ type: 'string', maxLength });
const choice = (values: string[]) => ({ type: 'string', enum: values });
const styles = ['breach', 'tension', 'counter', 'bond', 'rough_play', 'justice'];
const rarities = ['common', 'rising', 'advanced', 'top', 'legendary', 'hero', 'basara'];
const stats = ['power', 'control', 'technique', 'pressure', 'physical', 'agility', 'intelligence'];
export const revisionSchema = nullable({ type: 'integer', minimum: 1, maximum: 4294967294 });
export const teamIdSchema = { type: 'string', pattern: '^[A-Za-z0-9_-]{1,80}$' };
export const teamSchema = object({
  id: teamIdSchema,
  name: string(120),
  formation: { type: 'string', pattern: '^[a-z0-9-]{1,32}$' },
  slots: {
    type: 'object',
    maxProperties: 20,
    additionalProperties: false,
    patternProperties: {
      '^(field-(?:[1-9]|10|11)|bench-[1-5]|coach|manager-[1-3])$': object(
        {
          player: object({
            id,
            name: string(200),
            portraitUrl: nullable({ type: 'string', maxLength: 2000, pattern: '^https?://' }),
            position: nullable(choice(['GK', 'DF', 'MF', 'FW'])),
            element: nullable(choice(['wind', 'forest', 'fire', 'mountain', 'void'])),
            gender: nullable(choice(['male', 'female', 'neutral'])),
            playStyle: nullable(choice(styles)),
            role: nullable(string(80)),
            rarities: { type: 'array', maxItems: 7, uniqueItems: true, items: choice(rarities) },
            profiles: {
              type: 'array',
              maxItems: 6,
              items: object({
                rarity: choice(['common', 'hero', 'basara']),
                level: { type: 'integer', enum: [50, 99] },
                values: object(
                  Object.fromEntries(
                    stats.map((key) => [
                      key,
                      nullable({ type: 'number', minimum: 0, maximum: 10000 }),
                    ]),
                  ),
                ),
              }),
            },
          }),
          rarity: choice(rarities),
          playStyle: choice(styles),
          equipment: object(
            Object.fromEntries(
              ['boots', 'pendant', 'bracelet', 'accessory'].map((key) => [key, nullable(id)]),
            ),
            [],
          ),
          passives: {
            type: 'array',
            maxItems: 6,
            items: nullable(object({ id, value: { type: 'number', minimum: 0, maximum: 99999 } })),
          },
        },
        ['player', 'rarity'],
      ),
    },
  },
});
export const writeSchema = object({ team: teamSchema, revision: revisionSchema });
export const paramsSchema = object({ id: teamIdSchema });
export const deleteSchema = object({
  revision: { type: 'integer', minimum: 1, maximum: 4294967294 },
});
export function validateTeam(team: Team, draft = false) {
  const invalid = () => {
    throw new TeamError(400, 'INVALID_TEAM', 'La composition de cette équipe est invalide.');
  };
  if (!draft && !team.name.trim()) invalid();
  const ids = new Set<number>();
  let heroes = 0;
  let basaras = 0;
  for (const [slot, assignment] of Object.entries(team.slots)) {
    const { player, rarity } = assignment;
    if (ids.has(player.id) || !player.rarities.includes(rarity)) invalid();
    ids.add(player.id);
    const roles =
      slot === 'coach'
        ? ['Manager', 'Coach', 'Player Manager']
        : slot.startsWith('manager-')
          ? ['Coordinator', 'Player Coordinator']
          : ['Player', 'Player Manager', 'Player Coordinator'];
    if (!roles.includes(player.role ?? '')) invalid();
    if (slot.startsWith('field-')) {
      if (rarity === 'hero') heroes++;
      if (rarity === 'basara') basaras++;
    }
  }
  if (heroes > 2 || basaras > 1) invalid();
}
