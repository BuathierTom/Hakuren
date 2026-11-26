import type { CataloguePlan, RecordSpec, TechniqueSpec } from './prepare.js';
import { numberOrNull, object, safeUrl } from './prepare.js';
import { digest, GAME_SNAPSHOT, type Resource } from './sources.js';
import type {
  CatalogueTranslations,
  EquipmentSlot,
  ItemSection,
  PlayStyle,
  StatKey,
} from '../../../../shared/catalogue.js';

type Raw = Record<string, unknown>;
export interface ItemSpec {
  translations?: CatalogueTranslations;
  section: ItemSection;
  gameId: string;
  stringId: string;
  name: string;
  description: string | null;
  slot: EquipmentSlot | null;
  image: string | null;
  tension: number | null;
  stats: Record<string, number>;
  record: RecordSpec;
}
const categories: Record<string, string> = {
  '1': 'shoot',
  '2': 'dribble',
  '3': 'block',
  '4': 'catch',
};
const elements: Record<string, string | null> = {
  '1': 'wind',
  '2': 'forest',
  '3': 'fire',
  '4': 'mountain',
  '5': 'void',
};
const auras: Record<string, string> = {
  keshin: 'keshin',
  armed: 'keshin_armed',
  mixi_max: 'miximax',
  totem: 'totem',
  bond_transform: 'bond_transform',
  awakening_power: 'awakening_power',
  mode_change: 'mode_change',
  awakening_change: 'awakening_change',
};
const slots: Record<string, EquipmentSlot> = {
  boots: 'boots',
  bracelet: 'bracelet',
  pendant: 'pendant',
  special: 'accessory',
};
const playStyles: Record<string, PlayStyle> = {
  '0': 'breach',
  '1': 'counter',
  '2': 'bond',
  '3': 'tension',
  '4': 'rough_play',
  '5': 'justice',
};
const positions: Record<string, string> = { '1': 'GK', '2': 'FW', '3': 'MF', '4': 'DF' };
const fold = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}]/gu, '');
export function gameText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const result = value
    .replace(/\\+n/g, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();
  if (!result || /必殺.*[名めい]|test_|^\?+$|^undefined$/i.test(result)) return null;
  return result;
}
function tacticTension(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 99999)
    throw new Error('Coût de tactique invalide.');
  return Math.round(value * 10000) / 10000;
}
function gameId(value: unknown): string {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < -2147483648 ||
    value > 4294967295
  )
    throw new Error('Identifiant de jeu invalide.');
  return String(value);
}
function rows(bundle: Raw, table: string): Raw[] {
  const value = bundle[table];
  if (!Array.isArray(value)) throw new Error(`Table de jeu absente : ${table}`);
  return value.map(object);
}

export function enrichGameData(plan: CataloguePlan, resources: Map<string, Resource>): void {
  if (!resources.has('game-fr')) return;
  const locales = ['fr', 'en', 'ja'].map((locale) => {
    const resource = resources.get(`game-${locale}`);
    if (!resource) throw new Error(`Langue de jeu absente : ${locale}`);
    const bundle = object(JSON.parse(resource.body.replace(/^\uFEFF/, '')));
    if (bundle.lang !== locale) throw new Error('Langue du catalogue incohérente.');
    return { locale, resource, bundle };
  });
  if (new Set(locales.map((locale) => locale.bundle.game_version)).size !== 1)
    throw new Error('Versions des catalogues incohérentes.');
  const translationTables = new Map<string, Map<string, Raw>>();
  function translations(table: string, row: Raw): CatalogueTranslations {
    return Object.fromEntries(
      locales
        .filter((value) => value.locale === 'fr' || value.locale === 'en')
        .map((value) => {
          const key = `${value.locale}/${table}`;
          if (!translationTables.has(key))
            translationTables.set(
              key,
              new Map(rows(value.bundle, table).map((entry) => [gameId(entry.id), entry])),
            );
          const entry = translationTables.get(key)!.get(gameId(row.id));
          return [
            value.locale,
            { name: gameText(entry?.name), description: gameText(entry?.description) },
          ];
        }),
    );
  }
  const fr = locales[0]!;
  const en = locales[1]!;
  plan.gameData = true;
  const proof = (
    kind: string,
    key: string,
    payload: unknown,
    status: RecordSpec['status'] = 'verified',
  ): RecordSpec => {
    const record: RecordSpec = {
      source: 'kizuna-game-data',
      kind,
      key,
      version: GAME_SNAPSHOT,
      url: fr.resource.url,
      retrievedAt: fr.resource.retrievedAt,
      payload,
      status,
      note: null,
    };
    plan.records.push(record);
    return record;
  };
  const tables = ['hissatsu', 'aura_hissatsu', 'auras'];
  const localized = new Map<string, { locale: string; row: Raw }[]>();
  for (const locale of locales)
    for (const table of tables)
      for (const row of rows(locale.bundle, table)) {
        const id = gameId(row.id);
        localized.set(id, [...(localized.get(id) ?? []), { locale: locale.locale, row }]);
      }
  const english = new Map(
    tables.flatMap((table) => rows(en.bundle, table)).map((row) => [gameId(row.id), row]),
  );
  const rawEntries = tables.flatMap((table) =>
    rows(fr.bundle, table).map((row) => ({ table, row })),
  );
  const signature = (name: string, category: string | null, element: string | null) =>
    JSON.stringify([fold(name), category, element]);
  const counts = new Map<string, number>();
  const nameCounts = new Map<string, number>();
  for (const { table, row } of rawEntries) {
    const name = gameText(english.get(gameId(row.id))?.name);
    const category = table === 'auras' ? auras[String(row.type)] : categories[String(row.category)];
    const key = name && signature(name, category ?? null, elements[String(row.element)] ?? null);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    if (name) nameCounts.set(fold(name), (nameCounts.get(fold(name)) ?? 0) + 1);
  }
  const legacy = [...plan.techniques];
  const used = new Set<string>();
  const allIds = new Set<string>();
  const byId = new Map<string, TechniqueSpec>();
  for (const { table, row } of rawEntries) {
    const id = gameId(row.id);
    if (allIds.has(id)) throw new Error(`Technique de jeu dupliquée : ${id}`);
    allIds.add(id);
    const name = gameText(row.name);
    const category = table === 'auras' ? auras[String(row.type)] : categories[String(row.category)];
    if (!name || !category) continue;
    if (!Object.hasOwn(elements, String(row.element)))
      throw new Error('Élément de jeu non reconnu.');
    const element = elements[String(row.element)]!;
    const englishName = gameText(english.get(id)?.name);
    const candidates = englishName
      ? legacy.filter(
          (technique) =>
            !used.has(technique.key) &&
            [technique.name, technique.wikiName].some(
              (alias) => alias && fold(alias) === fold(englishName),
            ) &&
            (technique.category === category ||
              (category === 'awakening_power' && technique.category === 'passive') ||
              ((technique.category === null || technique.category === 'other') &&
                nameCounts.get(fold(englishName)) === 1)) &&
            ((technique.element !== null && element !== null) ||
              nameCounts.get(fold(englishName)) === 1) &&
            (technique.element === null || element === null || technique.element === element),
        )
      : [];
    const previous =
      candidates.length === 1 && counts.get(signature(englishName!, category, element)) === 1
        ? candidates[0]
        : undefined;
    const record = proof('ability', id, {
      ...row,
      names: Object.fromEntries(
        (localized.get(id) ?? []).map((value) => [value.locale, gameText(value.row.name)]),
      ),
      gameVersion: fr.bundle.game_version,
    });
    const notes = [
      row.is_longshot === true ? 'Tir longue distance' : null,
      row.is_block === true ? 'Blocage' : null,
      typeof row.cooldown === 'number' ? `CD ${numberOrNull(row.cooldown)}` : null,
    ].filter((note): note is string => !!note);
    const technique: TechniqueSpec = {
      key: previous?.key ?? `game:${id}`,
      name,
      translations: translations(table, row),
      wikiName: previous?.wikiName ?? null,
      category,
      element,
      preview: previous?.preview ?? null,
      record,
      gameId: id,
      stringId: typeof row.string_id === 'string' ? row.string_id : null,
      kind: table === 'auras' ? 'aura' : (table as 'hissatsu' | 'aura_hissatsu'),
      description: gameText(row.description),
      power: table === 'auras' ? null : numberOrNull(row.power),
      tension: table === 'auras' ? null : numberOrNull(row.tp_consumption),
      cooldown: numberOrNull(row.cooldown),
      notes,
      grantedGameId: table === 'auras' && row.skill_id != null ? gameId(row.skill_id) : null,
      legacyKey: previous
        ? {
            source: previous.record.source,
            external: `${previous.record.kind}/${previous.record.key}`,
          }
        : undefined,
      names: (localized.get(id) ?? []).flatMap((value) => {
        const text = gameText(value.row.name);
        return text ? [{ locale: value.locale, name: text }] : [];
      }),
      published: true,
    };
    if (previous) used.add(previous.key);
    byId.set(id, technique);
  }
  for (const technique of byId.values())
    if (technique.grantedGameId && byId.get(technique.grantedGameId)?.kind === 'aura')
      technique.grantedGameId = null;
  plan.techniques = [
    ...byId.values(),
    ...legacy
      .filter((technique) => !used.has(technique.key) && technique.category !== 'passive')
      .map((technique) => ({ ...technique, published: false })),
  ];
  const retained = new Set(plan.techniques.map((technique) => technique.key));
  plan.profiles = plan.profiles.filter((profile) => retained.has(profile.technique));
  plan.learnsets = plan.learnsets.filter(
    (move) => move.work !== 'VR' && retained.has(move.technique),
  );
  const characterRows = new Map<string, Raw[]>();
  for (const row of rows(fr.bundle, 'characters')) {
    if (typeof row.character_id !== 'string') continue;
    characterRows.set(row.character_id, [...(characterRows.get(row.character_id) ?? []), row]);
  }
  for (const variant of plan.variants) {
    const candidates = characterRows.get(variant.official.gameCharacterId ?? '') ?? [];
    const unique = new Map(
      candidates.map((row) => [JSON.stringify(translations('characters', row)), row]),
    );
    if (unique.size === 1)
      variant.translations = translations('characters', [...unique.values()][0]!);
  }
  const official = new Map<string, typeof plan.variants>();
  for (const variant of plan.variants)
    if (variant.official.gameCharacterId)
      official.set(variant.official.gameCharacterId, [
        ...(official.get(variant.official.gameCharacterId) ?? []),
        variant,
      ]);
  for (const [table, rarity] of [
    ['characters', null],
    ['heroes', 'hero'],
    ['basaras', 'basara'],
  ] as const) {
    const names = new Map(rows(en.bundle, table).map((row) => [gameId(row.id), row]));
    const seen = new Map<string, string>();
    for (const row of rows(fr.bundle, table)) {
      const id = gameId(row.id);
      const identityKey = JSON.stringify([row.character_id, row.skills, row.skills_alt ?? []]);
      if (seen.has(id)) {
        if (seen.get(id) !== identityKey)
          throw new Error(`Techniques de joueur incohérentes : ${table}/${id}`);
        continue;
      }
      seen.set(id, identityKey);
      const candidates =
        typeof row.character_id === 'string' ? (official.get(row.character_id) ?? []) : [];
      const variant = candidates.length === 1 ? candidates[0] : undefined;
      const identity = names.get(id);
      if (
        !variant ||
        !identity ||
        fold(String(identity.name)) !== fold(variant.official.name) ||
        positions[String(row.main_position)] !== variant.official.position ||
        elements[String(row.element)] !== variant.official.element.toLowerCase()
      )
        continue;
      const record = proof('learnset', `${id}/${rarity ?? 'base'}`, {
        id,
        characterId: row.character_id,
        rarity,
        style: row.style ?? null,
        skills: row.skills,
        alternative: row.skills_alt ?? [],
      });
      const profileRecord = proof('player_profile', `${id}/${rarity ?? 'common'}`, {
        id,
        characterId: row.character_id,
        rarity,
        description: gameText(row.description),
        stats_lv50: row.stats_lv50 ?? null,
        stats_lv99: row.stats_lv99 ?? null,
      });
      for (const level of [50, 99]) {
        const input = row[`stats_lv${level}`];
        if (!input) continue;
        const stats = object(input);
        const keys: StatKey[] = [
          'power',
          'control',
          'technique',
          'pressure',
          'physical',
          'agility',
          'intelligence',
        ];
        const values = Object.fromEntries(
          keys.map((key) => [key, numberOrNull(stats[key === 'power' ? 'kick' : key])]),
        ) as Record<StatKey, number | null>;
        variant.statProfiles ??= [];
        variant.statProfiles.push({
          rarity: rarity ?? 'common',
          level,
          values,
          record: profileRecord,
        });
      }
      if (table === 'characters' && row.style != null) {
        if (!Object.hasOwn(playStyles, String(row.style)))
          throw new Error('Style de jeu non reconnu.');
        variant.playStyle = { code: playStyles[String(row.style)]!, record };
      }
      for (const [branch, input] of [
        ['main', row.skills],
        ['alternative', row.skills_alt ?? []],
      ] as const) {
        if (!Array.isArray(input)) throw new Error('Techniques de joueur invalides.');
        for (const skill of input) {
          if (!Array.isArray(skill) || skill.length !== 2)
            throw new Error('Référence de technique invalide.');
          const technique = byId.get(gameId(skill[1]));
          if (!technique) continue;
          const level = numberOrNull(skill[0]);
          plan.learnsets.push({
            externalId: variant.externalId,
            technique: technique.key,
            work: 'VR',
            mode: 'standard',
            version: 'unspecified',
            section: rarity === 'hero' ? 'VRH' : rarity === 'basara' ? 'VRB' : 'VR',
            entryKey: `${branch}:${level}:${technique.gameId}`,
            level,
            alternatePath: branch === 'alternative',
            basaraOnly: rarity === 'basara' ? true : null,
            rarityScope: rarity ? 'restricted' : 'unknown',
            rarities: rarity ? [rarity] : [],
            flags: { gameId: technique.gameId },
            record,
          });
        }
      }
      if (rarity) plan.rarities.push({ externalId: variant.externalId, rarity, record });
    }
  }
  if (
    plan.variants.length > 1000 &&
    (byId.size < 500 ||
      new Set(
        plan.learnsets
          .filter((move) => move.record.source === 'kizuna-game-data')
          .map((move) => move.externalId),
      ).size <
        plan.variants.length * 0.7)
  )
    throw new Error('Couverture des données de jeu insuffisante : import interrompu.');
  const imageResource = resources.get('game-equipment-images');
  const images = imageResource ? object(JSON.parse(imageResource.body.replace(/^\uFEFF/, ''))) : {};
  plan.items = [];
  for (const table of ['equipment', 'tactics'] as const) {
    const enItems = new Map(rows(en.bundle, table).map((row) => [String(row.string_id), row]));
    const seen = new Set<string>();
    const sourceRows = rows(fr.bundle, table).sort(
      (a, b) =>
        Number(String(a.string_id).includes('_st')) - Number(String(b.string_id).includes('_st')),
    );
    for (const row of sourceRows) {
      const name = gameText(row.name);
      if (!name) continue;
      const stringId = String(row.string_id).split('_st')[0]!;
      if (seen.has(stringId)) continue;
      seen.add(stringId);
      const slot = table === 'equipment' ? slots[String(row.slot)] : null;
      if (table === 'equipment' && !slot) throw new Error('Emplacement d’équipement invalide.');
      const stats: Record<string, number> = {};
      if (table === 'equipment')
        for (const [key, value] of Object.entries(object(row.stats))) {
          const number = numberOrNull(value);
          if (number) stats[key === 'kick' ? 'power' : key] = number;
        }
      const imageRows = images[slot === 'accessory' ? 'misc' : (slot ?? '')];
      const enName = gameText(enItems.get(String(row.string_id))?.name);
      const candidates = Array.isArray(imageRows)
        ? imageRows
            .map(object)
            .filter(
              (image) =>
                enName && typeof image.name === 'string' && fold(image.name) === fold(enName),
            )
        : [];
      const record = proof(table === 'equipment' ? 'equipment' : 'tactic', stringId, row);
      plan.items.push({
        section: table,
        gameId: gameId(row.id),
        stringId,
        name,
        translations: translations(table, row),
        description: gameText(row.description),
        slot: slot ?? null,
        image: candidates.length === 1 ? safeUrl(candidates[0]!.image) : null,
        stats,
        tension: table === 'tactics' ? tacticTension(row.tp_cost) : null,
        record,
      });
    }
  }
}
