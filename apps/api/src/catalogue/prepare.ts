import type {
  CatalogueTranslations,
  PlayStyle,
  PlayerStatProfile,
} from '../../../../shared/catalogue.js';
import { FAMILIES, HISTORICAL_MEMBERSHIPS, WIKI_MAPPINGS } from './curation.js';
import { parseOfficial, WORKS, type OfficialPlayer } from './official.js';
import { digest, SNAPSHOT, type Resource } from './sources.js';
import { literalTable, pageName, parseMoves, wikiContent } from './wiki.js';
import { playerModuleId } from './team-sources.js';
import { prepareMemberships } from './memberships.js';
import { enrichGameData, type ItemSpec } from './game-data.js';
import { prepareExtras, type CatalogueExtras } from './extras.js';

type Raw = Record<string, unknown>;
export type Review = 'pending' | 'verified' | 'quarantined';
export interface RecordSpec {
  source: string;
  kind: string;
  key: string;
  version: string;
  url: string;
  retrievedAt: string;
  payload: unknown;
  status: Review;
  note: string | null;
}
export interface VariantSpec {
  translations?: CatalogueTranslations;
  statProfiles?: (PlayerStatProfile & { record: RecordSpec })[];
  playStyle?: { code: PlayStyle; record: RecordSpec };
  externalId: string;
  official: OfficialPlayer;
  record: RecordSpec;
  community: RecordSpec | null;
  portrait: string | null;
  stats: number[] | null;
  statsRecord: RecordSpec | null;
}
export interface TechniqueSpec {
  translations?: CatalogueTranslations;
  key: string;
  name: string;
  wikiName: string | null;
  category: string | null;
  element: string | null;
  preview: string | null;
  record: RecordSpec;
  gameId?: string;
  stringId?: string | null;
  kind?: 'hissatsu' | 'aura_hissatsu' | 'aura';
  description?: string | null;
  power?: number | null;
  tension?: number | null;
  cooldown?: number | null;
  notes?: string[];
  grantedGameId?: string | null;
  legacyKey?: { source: string; external: string };
  names?: { locale: string; name: string }[];
  published?: boolean;
}
export interface ProfileSpec {
  technique: string;
  work: string;
  key: string;
  rarity: string | null;
  power: number | null;
  cost: number | null;
  parameters: unknown;
  record: RecordSpec;
}
export interface LearnsetSpec {
  externalId: string;
  technique: string;
  work: string;
  mode: string;
  version: string;
  section: string;
  entryKey: string;
  level: number | null;
  alternatePath: boolean;
  basaraOnly: boolean | null;
  rarityScope: 'unknown' | 'restricted';
  rarities: string[];
  flags: unknown;
  record: RecordSpec;
}
export interface CataloguePlan {
  items?: ItemSpec[];
  extras?: CatalogueExtras;
  gameData?: boolean;
  records: RecordSpec[];
  variants: VariantSpec[];
  techniques: TechniqueSpec[];
  profiles: ProfileSpec[];
  learnsets: LearnsetSpec[];
  memberships: { id: number; work: string; team: string; record: RecordSpec }[];
  rarities: { externalId: string; rarity: string; record: RecordSpec }[];
  summary: Record<string, number>;
  warnings: string[];
}

export const STATS = [
  'Power',
  'Control',
  'Technique',
  'Pressure',
  'Physical',
  'Agility',
  'Intelligence',
];
export function object(value: unknown): Raw {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Objet JSON attendu.');
  return value as Raw;
}
export function text(value: unknown, maximum = 191): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum)
    throw new Error('Texte absent ou trop long.');
  return value.trim();
}
export function numberOrNull(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 65_535)
    throw new Error('Paramètre numérique invalide.');
  return value;
}
export function safeUrl(value: unknown): string | null {
  if (value == null) return null;
  const url = new URL(text(value, 1024));
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error('URL de média non autorisée.');
  return url.href;
}
export function browserVideoUrl(value: unknown): string | null {
  const input = safeUrl(value);
  if (!input) return null;
  const url = new URL(input);
  if (
    url.hostname === 'dxi4wb638ujep.cloudfront.net' &&
    /^\/1\/k\/[a-z0-9_/-]+\.wmv$/i.test(url.pathname)
  )
    url.pathname = url.pathname.replace(/\.wmv$/i, '.mp4');
  return /\.(mp4|webm)$/i.test(url.pathname) ? url.href : null;
}
export function element(value: unknown, work = 'VR'): string | null {
  if (value && typeof value === 'object' && !Array.isArray(value))
    return element(object(value)[work], work);
  if (value == null) return null;
  const known: Record<string, string> = {
    Wind: 'wind',
    Forest: 'forest',
    Fire: 'fire',
    Mountain: 'mountain',
    Void: 'void',
  };
  if (typeof value !== 'string' || !Object.hasOwn(known, value))
    throw new Error('Élément non reconnu.');
  return known[value]!;
}
const CATEGORIES: Record<string, string> = {
  Shoot: 'shoot',
  Dribble: 'dribble',
  Block: 'block',
  Catch: 'catch',
  Keshin: 'keshin',
  'Keshin Armed': 'keshin_armed',
  'Mix Max': 'miximax',
  Totem: 'totem',
  'Macro Tactic': 'tactic',
  'Awakening Power': 'passive',
  Passive: 'passive',
};
const WORK_CODES = new Map<string, string>(WORKS.map(([code, name]) => [name, code]));
export interface Curation {
  families: readonly { name: string; ids: readonly number[] }[];
  mappings: readonly {
    id: number;
    module: string;
    key: string;
    page: string;
    label?: string;
    historicalOnly?: boolean;
    expectedForm?: string;
  }[];
  memberships: readonly {
    id: number;
    work: string;
    team: string;
    module: string;
    key: string;
    form: string;
  }[];
}

export function prepareCatalogue(
  resources: Map<string, Resource>,
  curation: Curation = {
    families: FAMILIES,
    mappings: WIKI_MAPPINGS,
    memberships: HISTORICAL_MEMBERSHIPS,
  },
): CataloguePlan {
  const plan: CataloguePlan = {
    records: [],
    variants: [],
    techniques: [],
    profiles: [],
    learnsets: [],
    memberships: [],
    rarities: [],
    summary: {},
    warnings: [],
  };
  const resource = (id: string) => {
    const found = resources.get(id);
    if (!found) throw new Error(`Source manquante : ${id}`);
    return found;
  };
  const rows = (id: string): Raw[] => {
    const data: unknown = JSON.parse(resource(id).body);
    if (!Array.isArray(data) || !data.length) throw new Error(`Liste vide ou invalide : ${id}`);
    return data.map(object);
  };
  function record(
    source: string,
    kind: string,
    key: string,
    input: Resource,
    payload: unknown,
    status: Review = 'verified',
    note: string | null = null,
  ): RecordSpec {
    const result = {
      source,
      kind,
      key: text(key),
      version: source === 'vr-community' ? SNAPSHOT : `sha256:${digest(JSON.stringify(payload))}`,
      url: input.url,
      retrievedAt: input.retrievedAt,
      payload,
      status,
      note,
    };
    plan.records.push(result);
    return result;
  }
  const players = rows('players');
  const playerMap = new Map<number, Raw>();
  const parameterGroups = new Map<string, number>();
  const parameterKey = (p: Raw) => JSON.stringify([p.Name, p.Game, p['Age group']]);
  for (const p of players) {
    if (typeof p.ID !== 'number' || !Number.isSafeInteger(p.ID) || p.ID <= 0 || playerMap.has(p.ID))
      throw new Error('Numéro de joueur invalide ou dupliqué.');
    text(p.Name);
    playerMap.set(p.ID, p);
    parameterGroups.set(parameterKey(p), (parameterGroups.get(parameterKey(p)) ?? 0) + 1);
  }
  const official = new Map<number, OfficialPlayer>();
  for (const input of resources.values()) {
    if (!/^official-\d+$/.test(input.id)) continue;
    for (const row of parseOfficial(input.body)) {
      if (official.has(row.id)) throw new Error(`Fiche officielle dupliquée : ${row.id}`);
      if (!WORK_CODES.has(row.origin) || !['GK', 'DF', 'MF', 'FW'].includes(row.position))
        throw new Error(`Attribut officiel non reconnu : ${row.id}`);
      element(row.element);
      if (!['Male', 'Female', 'Unknown', 'Neutral'].includes(row.gender))
        throw new Error('Genre officiel non reconnu.');
      official.set(row.id, row);
      const identity = record('level5-codex', 'player', String(row.id), input, row);
      const p = playerMap.get(row.id);
      let community: RecordSpec | null = null;
      const portrait = row.portraitUrl;
      let stats: number[] | null = null;
      let statsRecord: RecordSpec | null = null;
      if (p) {
        const { Description, Techniques, ...facts } = p;
        const compared: [string, keyof OfficialPlayer][] = [
          ['Name', 'name'],
          ['Game', 'origin'],
          ['Gender', 'gender'],
          ['Element', 'element'],
          ['Position', 'position'],
          ['Role', 'role'],
          ['Age group', 'ageGroup'],
          ['Nickname', 'nickname'],
        ];
        const agrees = compared.every(([key, field]) => p[key] === row[field]);
        community = record(
          'vr-community',
          'player',
          String(row.id),
          resource('players'),
          facts,
          agrees ? 'verified' : 'quarantined',
          agrees ? null : 'Identité différente du codex courant.',
        );
        const unambiguous = agrees && parameterGroups.get(parameterKey(p)) === 1;
        const parameters = Object.fromEntries(STATS.map((key) => [key, p[key]]));
        statsRecord = record(
          'vr-community',
          'player_profile',
          String(row.id),
          resource('players'),
          parameters,
          unambiguous ? 'verified' : 'quarantined',
          unambiguous ? null : 'Rapprochement des paramètres ambigu ou identité différente.',
        );
        if (unambiguous) {
          const values = STATS.map((key) => numberOrNull(p[key]));
          if (values.every((value) => value !== null)) stats = values as number[];
        }
        if (!Array.isArray(Techniques)) throw new Error(`Liste de techniques invalide : ${row.id}`);
        if (agrees && ![3897, 3953].includes(row.id)) {
          const forms = new Set(Techniques.map((move) => object(move).Form));
          const known = ['Hero', 'Basara'].filter((form) => forms.has(form));
          if (known.length) {
            const proof = record(
              'vr-community',
              'player_rarities',
              String(row.id),
              resource('players'),
              { id: row.id, name: row.name, origin: row.origin, forms: known },
            );
            for (const form of known)
              plan.rarities.push({
                externalId: String(row.id),
                rarity: form.toLowerCase(),
                record: proof,
              });
          }
        }
        if (Techniques.length)
          record(
            'vr-community',
            'player_techniques',
            String(row.id),
            resource('players'),
            Techniques,
            [3897, 3953].includes(row.id) ? 'quarantined' : 'pending',
            'Correspondance automatique non publiée ; les drapeaux source de disponibilité sont incomplets.',
          );
      }
      plan.variants.push({
        externalId: String(row.id),
        official: row,
        record: identity,
        community,
        portrait,
        stats,
        statsRecord,
      });
    }
  }
  if (official.size < players.length * 0.9)
    throw new Error('Couverture du codex anormalement faible : import interrompu.');
  for (const p of players) {
    if (!official.has(p.ID as number)) {
      const { Description, ...facts } = p;
      record(
        'vr-community',
        'player',
        String(p.ID),
        resource('players'),
        facts,
        'quarantined',
        'Fiche absente du relevé officiel courant.',
      );
    }
  }
  const byName = new Map<string, TechniqueSpec>();
  for (const raw of rows('techniques')) {
    const name = text(raw.Name);
    if (byName.has(name)) throw new Error(`Technique dupliquée : ${name}`);
    const { Description, ...facts } = raw;
    const input = record('vr-community', 'technique', name, resource('techniques'), facts);
    const type = raw.Type == null ? null : text(raw.Type);
    const category =
      type === null ? null : Object.hasOwn(CATEGORIES, type) ? CATEGORIES[type] : undefined;
    if (category === undefined) throw new Error(`Catégorie non reconnue : ${String(raw.Type)}`);
    const technique = {
      key: name,
      name,
      wikiName: raw['Wiki name'] == null ? null : text(raw['Wiki name']),
      category,
      element: element(raw.Element),
      preview: browserVideoUrl(raw.Video),
      record: input,
    };
    plan.techniques.push(technique);
    byName.set(name, technique);
    for (const [key, rarity, power, cost] of [
      ['base', null, raw.Power, raw.Cost],
      ['basara', 'basara', raw['Basara power'], raw['Basara cost']],
    ] as const) {
      const p = numberOrNull(power);
      const c = numberOrNull(cost);
      if (p !== null || c !== null)
        plan.profiles.push({
          technique: name,
          work: 'VR',
          key,
          rarity,
          power: p,
          cost: c,
          parameters: null,
          record: input,
        });
    }
  }
  for (const [type, nameField, category] of [
    ['keshins', 'Name', 'keshin'],
    ['mixmax', 'Aura', 'miximax'],
    ['totems', 'Name', 'totem'],
  ] as const) {
    for (const raw of rows(type)) {
      const name = text(raw[nameField]);
      const input = record('vr-community', type, name, resource(type), raw);
      if (!byName.has(name)) {
        const technique = {
          key: name,
          name,
          wikiName: raw['Wiki name'] == null ? null : text(raw['Wiki name']),
          category,
          element: element(raw.Element),
          preview: null,
          record: input,
        };
        plan.techniques.push(technique);
        byName.set(name, technique);
      } else if (byName.get(name)!.category !== category)
        throw new Error(`Collision de pouvoir : ${name}`);
      if (type === 'keshins') {
        for (const work of ['GO', 'CS', 'GX']) {
          const kp = raw.KP == null ? null : (object(raw.KP)[work] ?? null);
          const attack = raw.Attack == null ? null : (object(raw.Attack)[work] ?? null);
          if (kp !== null || attack !== null)
            plan.profiles.push({
              technique: name,
              work,
              key: 'spirit',
              rarity: null,
              power: null,
              cost: null,
              parameters: { KP: kp, Attack: attack },
              record: input,
            });
        }
      } else if (type === 'totems' && raw['Galaxy stats'] != null) {
        const stats = object(raw['Galaxy stats']);
        plan.profiles.push({
          technique: name,
          work: 'GX',
          key: 'totem',
          rarity: null,
          power: numberOrNull(stats.Power),
          cost: numberOrNull(stats.Cost),
          parameters: stats,
          record: input,
        });
      }
    }
  }
  const wikiTechniques = wikiContent(resource('wiki-wazadata').body);
  const wikiNames = new Map<string, TechniqueSpec[]>();
  for (const technique of plan.techniques) {
    for (const name of new Set(
      [technique.name, technique.wikiName].filter((value): value is string => !!value),
    ))
      wikiNames.set(name, [...(wikiNames.get(name) ?? []), technique]);
  }
  for (const mapping of curation.mappings) {
    const player = official.get(mapping.id);
    const family = curation.families.find((f) => f.ids.includes(mapping.id));
    if (!player || player.name !== family?.name)
      throw new Error(`Correspondance d’identité à revoir : ${mapping.id}`);
    const input = resource(playerModuleId(mapping.module));
    const entry = literalTable(wikiContent(input.body), mapping.key);
    if (
      !entry ||
      pageName(entry) !== mapping.page ||
      (mapping.expectedForm && !entry.includes(mapping.expectedForm))
    )
      throw new Error(`Entrée wiki modifiée : ${mapping.key}`);
    const moveset = literalTable(entry, 'moveset');
    if (!moveset) continue;
    for (const match of moveset.matchAll(/(?:^|\n)[ \t]*([A-Z][A-Za-z0-9]*)\s*=\s*\{/g)) {
      const section = match[1]!;
      const historical = WORKS.find(([code]) => code === section);
      const vr = section.startsWith('VR');
      if (!historical && !vr) continue;
      if (mapping.historicalOnly && vr) continue;
      const modes: Record<string, [string, string, string[]]> = {
        VR: ['standard', 'unspecified', []],
        VRH: ['standard', 'unspecified', ['hero']],
        VRB: ['standard', 'unspecified', ['basara']],
        VRBeta: ['standard', 'beta', []],
      };
      const context = vr
        ? (modes[section] ??
          (/^VRBBS\d*$/.test(section)
            ? (['bb-stadium', 'unspecified', []] as [string, string, string[]])
            : null))
        : (['standard', 'unspecified', []] as [string, string, string[]]);
      const literal = literalTable(moveset, section)!;
      const sourceRecord = record(
        'inazuma-wiki',
        'learnset',
        `${mapping.module}/${mapping.key}/${section}`,
        input,
        {
          variantId: mapping.id,
          page: mapping.page,
          section,
          formLabel: mapping.label ?? null,
          literal,
        },
        context ? 'verified' : 'pending',
        context ? null : 'Contexte non pris en charge.',
      );
      if (!context) continue;
      let moves;
      try {
        moves = parseMoves(literal);
      } catch (error) {
        sourceRecord.status = 'quarantined';
        sourceRecord.note = (error as Error).message;
        continue;
      }
      for (const [index, move] of moves.entries()) {
        const waza = literalTable(wikiTechniques, move.key);
        const page = waza && pageName(waza);
        let candidates = page ? (wikiNames.get(page) ?? []) : [];
        const exactNames = candidates.filter(
          (candidate) => candidate.name.toLowerCase() === page?.toLowerCase(),
        );
        if (exactNames.length === 1) candidates = exactNames;
        if (!candidates.length && page && waza) {
          const wazaType = waza.match(/(?:^|\n)\s*wType\s*=\s*"([^"\n]+)"/)?.[1];
          const kinds: Record<string, string> = {
            SH: 'shoot',
            OF: 'dribble',
            DF: 'block',
            GK: 'catch',
            SK: 'passive',
            PS: 'passive',
            KH: 'keshin',
            MM: 'miximax',
            SL: 'totem',
          };
          const proof = record('inazuma-wiki', 'technique', move.key, resource('wiki-wazadata'), {
            key: move.key,
            page,
            type: wazaType ?? null,
          });
          const technique: TechniqueSpec = {
            key: `wiki:${move.key}`,
            name: text(page),
            wikiName: page,
            category: wazaType ? (kinds[wazaType] ?? null) : null,
            element: null,
            preview: null,
            record: proof,
          };
          plan.techniques.push(technique);
          wikiNames.set(page, [technique]);
          candidates = [technique];
        }
        if (candidates.length !== 1) {
          record(
            'inazuma-wiki',
            'unresolved_move',
            `${mapping.module}/${mapping.key}/${section}/${index}`,
            input,
            { key: move.key, page, variantId: mapping.id, flags: move.flags },
            'quarantined',
            'Référence de technique absente ou ambiguë.',
          );
          continue;
        }
        const [mode, version, rarities] = context;
        const mainVR = section === 'VR';
        const basaraOnly = mainVR
          ? move.level !== null && move.level > 20 && move.flags.NB === undefined
          : section === 'VRB'
            ? true
            : null;
        plan.learnsets.push({
          externalId: String(mapping.id),
          technique: candidates[0]!.key,
          work: vr ? 'VR' : section,
          mode,
          version,
          section,
          entryKey: `${section}:${move.key}:${digest(JSON.stringify([move.level, move.alternatePath, move.flags.evolution ?? null, move.flags.sourceLevel ?? null])).slice(0, 12)}`,
          level: move.level,
          alternatePath: move.alternatePath,
          basaraOnly,
          rarityScope: basaraOnly || rarities.length ? 'restricted' : 'unknown',
          rarities: basaraOnly ? ['basara'] : rarities,
          flags: { ...move.flags, wikiKey: move.key },
          record: sourceRecord,
        });
      }
    }
  }
  for (const membership of curation.memberships) {
    const input = resource(playerModuleId(membership.module));
    const entry = literalTable(wikiContent(input.body), membership.key);
    if (
      !entry?.includes(`form="${membership.form}"`) ||
      !official.get(membership.id)?.appearances.includes(membership.work)
    )
      throw new Error('Appartenance historique à revoir.');
    const proof = record(
      'inazuma-wiki',
      'team_membership',
      `${membership.id}/${membership.work}/${membership.team}`,
      input,
      membership,
    );
    plan.memberships.push({ ...membership, record: proof });
  }
  const historical = prepareMemberships(resources, plan.variants);
  plan.memberships.push(...historical.memberships);
  plan.records.push(...historical.records);
  enrichGameData(plan, resources);
  plan.extras = prepareExtras(resources);
  plan.summary = {
    passives: plan.extras.passives.length,
    teamBadges: plan.extras.badges.length,
    variants: plan.variants.length,
    techniques: plan.techniques.length,
    publishedTechniques: plan.techniques.filter((technique) => technique.published !== false)
      .length,
    appearances: plan.variants.reduce(
      (total, variant) => total + variant.official.appearances.length,
      0,
    ),
    statProfiles: plan.variants.filter((variant) => variant.stats).length,
    techniqueProfiles: plan.profiles.length,
    learnsets: plan.learnsets.length,
    historicalMemberships: plan.memberships.length,
    heroVariants: new Set(
      plan.rarities.filter((entry) => entry.rarity === 'hero').map((entry) => entry.externalId),
    ).size,
    basaraVariants: new Set(
      plan.rarities.filter((entry) => entry.rarity === 'basara').map((entry) => entry.externalId),
    ).size,
    equipment: plan.items?.filter((item) => item.section === 'equipment').length ?? 0,
    tactics: plan.items?.filter((item) => item.section === 'tactics').length ?? 0,
    pendingRecords: plan.records.filter((record) => record.status === 'pending').length,
    quarantinedRecords: plan.records.filter((record) => record.status === 'quarantined').length,
  };
  plan.warnings = [
    'Les équipes sont rattachées aux générations documentées dans les effectifs ; les liens sans identité, équipe ou apparition concordante restent absents.',
    plan.gameData
      ? 'Les techniques Victory Road sont liées par identifiant de personnage ; le wiki complète les épisodes historiques.'
      : 'Les movesets communautaires non vérifiés restent en attente ; les liens publiés proviennent des correspondances wiki explicites.',
    'Les alias français et les disponibilités de rareté non établies ne sont pas inventés.',
  ];
  return plan;
}
