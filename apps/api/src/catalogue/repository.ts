import type { Pool, RowDataPacket } from 'mysql2/promise';
import { WIKI_MAPPINGS } from './curation.js';
import { NON_TEAMS } from './team-sources.js';
import type {
  CatalogueFilters,
  Page,
  PlayerDetail,
  PlayerQuery,
  PlayerSummary,
  TechniqueDetail,
  TechniqueQuery,
  TechniqueSummary,
  Work,
  Rarity,
  PlayerLearnset,
  PlayerStatProfile,
  TechniqueProfile,
  Element,
  CatalogueItem,
  ItemQuery,
  ItemSection,
} from '../../../../shared/catalogue.js';

export interface CatalogueRepository {
  filters(): Promise<CatalogueFilters>;
  items?(section: ItemSection, query: ItemQuery): Promise<Page<CatalogueItem>>;
  item?(section: ItemSection, id: number): Promise<CatalogueItem | null>;
  players(query: PlayerQuery): Promise<Page<PlayerSummary>>;
  player(id: number): Promise<PlayerDetail | null>;
  techniques(query: TechniqueQuery): Promise<Page<TechniqueSummary>>;
  technique(id: number): Promise<TechniqueDetail | null>;
}
type Values = (string | number)[];
const approved = (alias: string, source: string) =>
  `(${alias}.source_record_id IS NULL OR ${source}.review_status='verified')`;
const PLAYER_FROM = `FROM player_variants v
  LEFT JOIN source_records vs ON vs.id=v.source_record_id
  LEFT JOIN works ow ON ow.id=v.origin_work_id
  LEFT JOIN variant_external_ids ext ON ext.variant_id=v.id AND ext.source_id=(SELECT id FROM data_sources WHERE code='level5-codex')`;
const PLAYER_FIELDS = `v.id, v.character_id, v.name, v.variant_label, v.portrait_url, v.element, v.position,
  v.role, v.age_group, v.gender, v.school_year, vs.payload AS identity_payload, CASE WHEN v.style_source_record_id IS NULL OR EXISTS (SELECT 1 FROM source_records st WHERE st.id=v.style_source_record_id AND st.review_status='verified') THEN v.play_style ELSE NULL END AS play_style, ext.external_key AS number,
  ow.id AS origin_id, ow.code AS origin_code, ow.name AS origin_name, ow.kind AS origin_kind`;
const TECH_FROM = 'FROM techniques t LEFT JOIN source_records ts ON ts.id=t.source_record_id';
const publishedTechnique = `t.is_published=1 AND t.category IS NOT NULL AND t.category NOT IN ('passive','other','tactic')`;
const TECH_ELEMENT = `COALESCE(t.element,CASE WHEN ts.entity_kind='ability'
  AND ts.source_id=(SELECT id FROM data_sources WHERE code='kizuna-game-data')
  AND JSON_EXTRACT(ts.payload,'$.element')=5 THEN 'void' ELSE NULL END)`;
const TECH_FIELDS = `t.id,t.name,t.category,${TECH_ELEMENT} AS element,t.game_id,t.kind,t.power,t.tension,t.notes`;
const pattern = (q: string) => `%${q.replace(/[!%_]/g, '!$&')}%`;
const work = (row: RowDataPacket, prefix = ''): Work => ({
  id: row[`${prefix}id`],
  code: row[`${prefix}code`],
  name: row[`${prefix}name`],
  kind: row[`${prefix}kind`],
});
const rarity = (row: RowDataPacket): Rarity => ({ code: row.code, name: row.name });
const technique = (row: RowDataPacket): TechniqueSummary => ({
  id: row.id,
  name: row.name,
  category: row.category,
  element: row.element,
  gameId: row.game_id ?? null,
  kind: row.kind ?? null,
  power: row.power ?? null,
  tension: row.tension ?? null,
  notes: Array.isArray(json(row.notes)) ? (json(row.notes) as string[]) : [],
});
function json(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}
export function contextualElement(
  payload: unknown,
  code: string,
  fallback: Element | null,
): Element | null {
  const data = json(payload);
  if (!data || typeof data !== 'object' || !Object.hasOwn(data, 'Element'))
    return code === 'VR' ? fallback : null;
  let value: unknown = (data as Record<string, unknown>).Element;
  if (value && typeof value === 'object' && !Array.isArray(value))
    value = Object.hasOwn(value, code) ? (value as Record<string, unknown>)[code] : null;
  const result = typeof value === 'string' ? value.toLowerCase() : null;
  return result && ['wind', 'forest', 'fire', 'mountain', 'void'].includes(result)
    ? (result as Element)
    : null;
}
function url(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const result = new URL(value);
    return result.protocol === 'https:' && !result.username && !result.password
      ? result.href
      : null;
  } catch {
    return null;
  }
}

export function createCatalogueRepository(pool: Pool): CatalogueRepository {
  async function rows(sql: string, values: Values = []): Promise<RowDataPacket[]> {
    const [result] = await pool.execute<RowDataPacket[]>({ sql, timeout: 10_000 }, values);
    return result;
  }
  async function summaries(input: RowDataPacket[]): Promise<PlayerSummary[]> {
    if (!input.length) return [];
    const ids = input.map((row) => row.id as number);
    const placeholders = ids.map(() => '?').join(',');
    const [appearances, rarities, memberships] = await Promise.all([
      rows(
        `SELECT a.variant_id, w.id, w.code, w.name, w.kind FROM variant_appearances a
        JOIN works w ON w.id=a.work_id LEFT JOIN source_records s ON s.id=a.source_record_id
        WHERE a.variant_id IN (${placeholders}) AND ${approved('a', 's')} ORDER BY w.sort_order, w.id`,
        ids,
      ),
      rows(
        `SELECT a.variant_id, r.code, r.name FROM variant_rarities a JOIN rarities r ON r.id=a.rarity_id
        LEFT JOIN source_records s ON s.id=a.source_record_id
        WHERE a.variant_id IN (${placeholders}) AND ${approved('a', 's')} ORDER BY r.sort_order, r.id`,
        ids,
      ),
      rows(
        `SELECT a.variant_id,a.work_id,ht.name FROM appearance_teams m JOIN variant_appearances a ON a.id=m.appearance_id
        JOIN historical_teams ht ON ht.id=m.historical_team_id
        LEFT JOIN source_records ms ON ms.id=m.source_record_id LEFT JOIN source_records aps ON aps.id=a.source_record_id
        LEFT JOIN source_records hs ON hs.id=ht.source_record_id
        WHERE a.variant_id IN (${placeholders}) AND ${approved('m', 'ms')} AND ${approved('a', 'aps')} AND ${approved('ht', 'hs')}
        ORDER BY ht.name`,
        ids,
      ),
    ]);
    return input.map((row) => {
      const payload = json(row.identity_payload);
      const recorded =
        payload && typeof payload === 'object' && 'teams' in payload && Array.isArray(payload.teams)
          ? payload.teams
          : [];
      const originTeams = memberships
        .filter((entry) => entry.variant_id === row.id && entry.work_id === row.origin_id)
        .map((entry) => entry.name as string);
      const teams = originTeams.length
        ? originTeams
        : recorded.filter(
            (team): team is string =>
              typeof team === 'string' && !!team.trim() && !NON_TEAMS.has(team),
          );
      return {
        id: row.id,
        number: row.number ?? null,
        name: row.name,
        variantLabel: row.variant_label,
        formLabel:
          WIKI_MAPPINGS.find(
            (mapping) =>
              mapping.id === Number(row.number) &&
              !('historicalOnly' in mapping && mapping.historicalOnly),
          )?.label ?? null,
        portraitUrl: url(row.portrait_url),
        element: row.element,
        position: row.position,
        gender: row.gender,
        playStyle: row.play_style,
        role: row.role,
        ageGroup: row.age_group,
        teams: [...new Set(teams)],
        origin: row.origin_id ? work(row, 'origin_') : null,
        appearances: appearances.filter((a) => a.variant_id === row.id).map((row) => work(row)),
        rarities: rarities.filter((r) => r.variant_id === row.id).map(rarity),
      };
    });
  }
  function playerWhere(query: PlayerQuery) {
    const conditions = [approved('v', 'vs')];
    const values: Values = [];
    const q = query.q?.trim();
    if (q) {
      conditions.push(`(v.name LIKE ? ESCAPE '!' OR EXISTS (SELECT 1 FROM character_names n
        LEFT JOIN source_records ns ON ns.id=n.source_record_id WHERE n.character_id=v.character_id AND n.name LIKE ? ESCAPE '!' AND ${approved('n', 'ns')}) OR ext.external_key=?
        OR EXISTS (SELECT 1 FROM historical_teams ht LEFT JOIN source_records hs ON hs.id=ht.source_record_id
          WHERE ht.name LIKE ? ESCAPE '!' AND ${approved('ht', 'hs')}
          AND (JSON_CONTAINS(JSON_EXTRACT(vs.payload,'$.teams'),JSON_QUOTE(ht.name))=1
            OR EXISTS (SELECT 1 FROM appearance_teams tm JOIN variant_appearances ta ON ta.id=tm.appearance_id
              LEFT JOIN source_records tms ON tms.id=tm.source_record_id LEFT JOIN source_records tas ON tas.id=ta.source_record_id
              WHERE tm.historical_team_id=ht.id AND ta.variant_id=v.id AND ${approved('tm', 'tms')} AND ${approved('ta', 'tas')}))))`);
      values.push(pattern(q), pattern(q), q, pattern(q));
    }
    if (query.work) {
      conditions.push(`EXISTS (SELECT 1 FROM variant_appearances a JOIN works w ON w.id=a.work_id
        LEFT JOIN source_records s ON s.id=a.source_record_id WHERE a.variant_id=v.id AND w.code=? AND ${approved('a', 's')})`);
      values.push(query.work);
    }
    if (query.position) {
      conditions.push('v.position=?');
      values.push(query.position);
    }
    if (query.element) {
      conditions.push('v.element=?');
      values.push(query.element);
    }
    if (query.gender) {
      conditions.push('v.gender=?');
      values.push(query.gender);
    }
    if (query.style) {
      conditions.push(
        "v.play_style=? AND (v.style_source_record_id IS NULL OR EXISTS (SELECT 1 FROM source_records st WHERE st.id=v.style_source_record_id AND st.review_status='verified'))",
      );
      values.push(query.style);
    }
    if (query.role === 'player')
      conditions.push(`v.role IN ('Player','Player Manager','Player Coordinator')`);
    if (query.role === 'staff')
      conditions.push(
        `v.role IN ('Manager','Coach','Coordinator','Player Manager','Player Coordinator')`,
      );
    if (query.role === 'manager') conditions.push("v.role IN ('Manager','Player Manager')");
    if (query.role === 'coordinator')
      conditions.push("v.role IN ('Coordinator','Player Coordinator')");
    if (query.rarity) {
      conditions.push(`EXISTS (SELECT 1 FROM variant_rarities a JOIN rarities r ON r.id=a.rarity_id
        LEFT JOIN source_records s ON s.id=a.source_record_id WHERE a.variant_id=v.id AND r.code=? AND ${approved('a', 's')})`);
      values.push(query.rarity);
    }
    if (query.technique) {
      conditions.push(`EXISTS (SELECT 1 FROM variant_learnsets l JOIN game_contexts c ON c.id=l.context_id JOIN works w ON w.id=c.work_id
        JOIN techniques t ON t.id=l.technique_id LEFT JOIN source_records ls ON ls.id=l.source_record_id
        LEFT JOIN source_records ts ON ts.id=t.source_record_id WHERE l.variant_id=v.id AND l.technique_id=? AND l.is_current=1
        AND ${approved('l', 'ls')} AND ${approved('t', 'ts')} ${query.work ? 'AND w.code=?' : ''})`);
      values.push(query.technique);
      if (query.work) values.push(query.work);
    }
    return { sql: `WHERE ${conditions.join(' AND ')}`, values };
  }
  function techniqueWhere(query: TechniqueQuery) {
    const conditions = [approved('t', 'ts'), publishedTechnique];
    const values: Values = [];
    const q = query.q?.trim();
    if (q) {
      const byGameId = /^-?\d{1,10}$/.test(q);
      conditions.push(`(t.name LIKE ? ESCAPE '!' OR EXISTS (SELECT 1 FROM technique_names n
        LEFT JOIN source_records ns ON ns.id=n.source_record_id WHERE n.technique_id=t.id AND n.name LIKE ? ESCAPE '!' AND ${approved('n', 'ns')})${byGameId ? ' OR t.game_id=?' : ''})`);
      values.push(pattern(q), pattern(q));
      if (byGameId) values.push(q);
    }
    if (query.element) {
      if (query.work) {
        conditions.push(`(CASE WHEN JSON_TYPE(JSON_EXTRACT(ts.payload,'$.Element'))='OBJECT'
          THEN LOWER(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(ts.payload,?)),'null'))
          WHEN JSON_TYPE(JSON_EXTRACT(ts.payload,'$.Element'))='STRING' THEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(ts.payload,'$.Element')))
          WHEN JSON_TYPE(JSON_EXTRACT(ts.payload,'$.Element')) IS NOT NULL THEN NULL
          WHEN ?='VR' THEN ${TECH_ELEMENT} ELSE NULL END)=?`);
        values.push(`$.Element.${JSON.stringify(query.work)}`, query.work, query.element);
      } else {
        conditions.push(`${TECH_ELEMENT}=?`);
        values.push(query.element);
      }
    }
    if (query.category === 'unknown') conditions.push('t.category IS NULL');
    else if (query.category) {
      conditions.push('t.category=?');
      values.push(query.category);
    }
    if (query.work) {
      conditions.push(`(EXISTS (SELECT 1 FROM technique_stat_profiles p JOIN game_contexts c ON c.id=p.context_id JOIN works w ON w.id=c.work_id
        LEFT JOIN source_records ps ON ps.id=p.source_record_id WHERE p.technique_id=t.id AND w.code=? AND ${approved('p', 'ps')})
        OR EXISTS (SELECT 1 FROM variant_learnsets l JOIN game_contexts c ON c.id=l.context_id JOIN works w ON w.id=c.work_id
        LEFT JOIN source_records ls ON ls.id=l.source_record_id WHERE l.technique_id=t.id AND l.is_current=1 AND w.code=? AND ${approved('l', 'ls')})
        OR (?='VR' AND ts.entity_kind='technique' AND ts.source_id=(SELECT id FROM data_sources WHERE code='vr-community')))`);
      values.push(query.work, query.work, query.work);
    }
    return { sql: `WHERE ${conditions.join(' AND ')}`, values };
  }

  function itemSummary(row: RowDataPacket): CatalogueItem {
    return {
      id: row.id,
      section: row.section,
      gameId: row.game_id,
      stringId: row.string_id,
      name: row.name,
      description: row.description,
      slot: row.slot,
      imageUrl: url(row.image_url),
      tension: row.tension == null ? null : Number(row.tension),
      stats: (json(row.stats) ?? {}) as CatalogueItem['stats'],
      sourceUrl: url(row.source_url),
    };
  }
  return {
    async items(section, query) {
      const values: Values = [section];
      const conditions = ['i.section=?', 'i.is_published=1', approved('i', 's')];
      if (query.q?.trim()) {
        const q = query.q.trim();
        const byIdentifier = /^[a-z0-9_-]+$/i.test(q);
        conditions.push(
          `(i.name LIKE ? ESCAPE '!'${byIdentifier ? ' OR i.game_id=? OR i.string_id=?' : ''})`,
        );
        values.push(pattern(q));
        if (byIdentifier) values.push(q, q);
      }
      if (query.slot) {
        conditions.push('i.slot=?');
        values.push(query.slot);
      }
      const from = `FROM catalogue_items i LEFT JOIN source_records s ON s.id=i.source_record_id WHERE ${conditions.join(' AND ')}`;
      const page = query.page ?? 1;
      const limit = query.limit ?? 24;
      const [items, count] = await Promise.all([
        rows(`SELECT i.*,s.source_url ${from} ORDER BY i.name,i.id LIMIT ? OFFSET ?`, [
          ...values,
          limit,
          (page - 1) * limit,
        ]),
        rows(`SELECT COUNT(*) AS total ${from}`, values),
      ]);
      const total = Number(count[0]?.total ?? 0);
      return { items: items.map(itemSummary), total, page, limit, pages: Math.ceil(total / limit) };
    },
    async item(section, id) {
      const found = await rows(
        `SELECT i.*,s.source_url FROM catalogue_items i LEFT JOIN source_records s ON s.id=i.source_record_id WHERE i.section=? AND i.id=? AND i.is_published=1 AND ${approved('i', 's')}`,
        [section, id],
      );
      return found[0] ? itemSummary(found[0]) : null;
    },
    async filters() {
      const [works, rarities, counts] = await Promise.all([
        rows(`SELECT w.id, w.code, w.name, w.kind, COUNT(DISTINCT CASE WHEN ${approved('a', 'aps')} AND ${approved('v', 'vs')} THEN v.id END) AS player_count FROM works w
          LEFT JOIN variant_appearances a ON a.work_id=w.id LEFT JOIN source_records aps ON aps.id=a.source_record_id
          LEFT JOIN player_variants v ON v.id=a.variant_id AND ${approved('a', 'aps')}
          LEFT JOIN source_records vs ON vs.id=v.source_record_id
          GROUP BY w.id,w.code,w.name,w.kind,w.sort_order ORDER BY w.sort_order,w.id`),
        rows('SELECT code,name FROM rarities ORDER BY sort_order,id'),
        rows(`SELECT (SELECT COUNT(*) FROM player_variants v LEFT JOIN source_records vs ON vs.id=v.source_record_id WHERE ${approved('v', 'vs')}) AS players,
          (SELECT COUNT(*) FROM techniques t LEFT JOIN source_records ts ON ts.id=t.source_record_id WHERE ${approved('t', 'ts')} AND ${publishedTechnique}) AS techniques,
          (SELECT COUNT(*) FROM variant_appearances a JOIN player_variants v ON v.id=a.variant_id
            LEFT JOIN source_records s ON s.id=a.source_record_id LEFT JOIN source_records vs ON vs.id=v.source_record_id
            WHERE ${approved('a', 's')} AND ${approved('v', 'vs')}) AS appearances`),
      ]);
      return {
        works: works.map((row) => ({ ...work(row), playerCount: Number(row.player_count) })),
        rarities: rarities.map(rarity),
        counts: {
          players: Number(counts[0]?.players ?? 0),
          techniques: Number(counts[0]?.techniques ?? 0),
          equipment: Number(
            (
              await rows(
                "SELECT COUNT(*) AS total FROM catalogue_items i LEFT JOIN source_records s ON s.id=i.source_record_id WHERE i.section='equipment' AND i.is_published=1 AND " +
                  approved('i', 's'),
              )
            )[0]?.total ?? 0,
          ),
          tactics: Number(
            (
              await rows(
                "SELECT COUNT(*) AS total FROM catalogue_items i LEFT JOIN source_records s ON s.id=i.source_record_id WHERE i.section='tactics' AND i.is_published=1 AND " +
                  approved('i', 's'),
              )
            )[0]?.total ?? 0,
          ),
          appearances: Number(counts[0]?.appearances ?? 0),
        },
      };
    },
    async players(query) {
      const { sql, values } = playerWhere(query);
      const page = query.page ?? 1;
      const limit = query.limit ?? 24;
      const sort =
        query.sort === 'number'
          ? 'COALESCE(CAST(ext.external_key AS UNSIGNED),v.id),v.id'
          : 'v.name,v.id';
      const [items, count] = await Promise.all([
        rows(`SELECT ${PLAYER_FIELDS} ${PLAYER_FROM} ${sql} ORDER BY ${sort} LIMIT ? OFFSET ?`, [
          ...values,
          limit,
          (page - 1) * limit,
        ]),
        rows(`SELECT COUNT(*) AS total ${PLAYER_FROM} ${sql}`, values),
      ]);
      const total = Number(count[0]?.total ?? 0);
      return { items: await summaries(items), total, page, limit, pages: Math.ceil(total / limit) };
    },
    async player(id) {
      const found = await rows(
        `SELECT ${PLAYER_FIELDS}, vs.payload, vs.source_url ${PLAYER_FROM} WHERE v.id=? AND ${approved('v', 'vs')}`,
        [id],
      );
      const row = found[0];
      if (!row) return null;
      const [summary] = await summaries(found);
      if (!summary) return null;
      const [aliases, history, stats, learnsets, variants] = await Promise.all([
        row.character_id
          ? rows(
              `SELECT n.name FROM character_names n LEFT JOIN source_records s ON s.id=n.source_record_id
          WHERE n.character_id=? AND ${approved('n', 's')} ORDER BY n.locale,n.name`,
              [row.character_id],
            )
          : Promise.resolve([]),
        rows(
          `SELECT a.work_id, ht.name FROM appearance_teams m JOIN variant_appearances a ON a.id=m.appearance_id
          JOIN historical_teams ht ON ht.id=m.historical_team_id LEFT JOIN source_records ms ON ms.id=m.source_record_id
          LEFT JOIN source_records aps ON aps.id=a.source_record_id LEFT JOIN source_records hs ON hs.id=ht.source_record_id
          WHERE a.variant_id=? AND ${approved('m', 'ms')} AND ${approved('a', 'aps')} AND ${approved('ht', 'hs')} ORDER BY ht.name`,
          [id],
        ),
        rows(
          `SELECT p.*,r.code AS rarity_code,s.payload AS stat_payload FROM player_stat_profiles p JOIN game_contexts c ON c.id=p.context_id JOIN works w ON w.id=c.work_id
          LEFT JOIN rarities r ON r.id=p.rarity_id
          LEFT JOIN source_records s ON s.id=p.source_record_id WHERE p.variant_id=? AND w.code='VR'
          AND (p.profile_key='base-lv50' OR p.profile_key LIKE 'game-%') AND c.mode_code='standard' AND ${approved('p', 's')} ORDER BY p.level DESC,p.id DESC`,
          [id],
        ),
        rows(
          `SELECT l.id, l.unlock_level, l.source_flags, l.alternate_path, l.basara_only, l.rarity_scope, c.mode_code,c.game_version,
          ls.external_key AS learnset_source_key,ls.payload AS learnset_source_payload,lds.code AS learnset_source,
          t.id AS technique_id,t.name AS technique_name,t.category,t.tension AS technique_tension,${TECH_ELEMENT} AS element,ts.payload AS technique_element_payload,
          w.id AS work_id,w.code AS work_code,w.name AS work_name,w.kind AS work_kind
          FROM variant_learnsets l JOIN techniques t ON t.id=l.technique_id JOIN game_contexts c ON c.id=l.context_id JOIN works w ON w.id=c.work_id
          LEFT JOIN source_records ls ON ls.id=l.source_record_id LEFT JOIN source_records ts ON ts.id=t.source_record_id
          LEFT JOIN data_sources lds ON lds.id=ls.source_id
          WHERE l.variant_id=? AND l.is_current=1 AND ${approved('l', 'ls')} AND ${approved('t', 'ts')} AND ${publishedTechnique}
          ORDER BY w.sort_order,c.mode_code,l.unlock_level,l.id`,
          [id],
        ),
        row.character_id
          ? rows(
              `SELECT ${PLAYER_FIELDS} ${PLAYER_FROM} WHERE v.character_id=? AND v.id<>? AND ${approved('v', 'vs')} ORDER BY v.id LIMIT 24`,
              [row.character_id, id],
            )
          : Promise.resolve([]),
      ]);
      const ids = learnsets.map((l) => l.id as number);
      const availability = ids.length
        ? await rows(
            `SELECT a.learnset_id,r.code,r.name FROM learnset_rarities a JOIN rarities r ON r.id=a.rarity_id
        LEFT JOIN source_records s ON s.id=a.source_record_id WHERE a.learnset_id IN (${ids.map(() => '?').join(',')}) AND ${approved('a', 's')} ORDER BY r.sort_order,r.id`,
            ids,
          )
        : [];
      const moves: PlayerLearnset[] = learnsets.map((l) => {
        const flags = json(l.source_flags);
        const evolution =
          flags &&
          typeof flags === 'object' &&
          'evolution' in flags &&
          typeof flags.evolution === 'string'
            ? flags.evolution
            : null;
        const payload = json(l.learnset_source_payload);
        const storedLabel =
          payload &&
          typeof payload === 'object' &&
          'formLabel' in payload &&
          typeof payload.formLabel === 'string'
            ? payload.formLabel
            : null;
        const formLabel =
          storedLabel ??
          (l.learnset_source === 'inazuma-wiki'
            ? (WIKI_MAPPINGS.find(
                (mapping) =>
                  mapping.id === Number(row.number) &&
                  l.learnset_source_key.startsWith(`${mapping.module}/${mapping.key}/`),
              )?.label ?? null)
            : null);
        return {
          id: l.id,
          technique: {
            id: l.technique_id,
            name: l.technique_name,
            category: l.category,
            tension: l.technique_tension ?? null,
            element: contextualElement(l.technique_element_payload, l.work_code, l.element),
          },
          work: work(l, 'work_'),
          mode: l.mode_code,
          version: l.game_version,
          level: l.unlock_level,
          alternatePath: l.alternate_path === null ? null : !!l.alternate_path,
          basaraOnly: l.basara_only === null ? null : !!l.basara_only,
          formLabel,
          evolution,
          rarityScope: l.rarity_scope,
          rarities: availability.filter((r) => r.learnset_id === l.id).map(rarity),
        };
      });
      const payload = json(row.payload);
      const teams =
        payload && typeof payload === 'object' && 'teams' in payload ? payload.teams : null;
      const profile = stats.find((entry) => entry.profile_key === 'base-lv50');
      const statProfiles: PlayerStatProfile[] = stats
        .filter((entry) => entry.profile_key.startsWith('game-'))
        .map((entry) => ({
          rarity:
            entry.rarity_code === 'hero' || entry.rarity_code === 'basara'
              ? entry.rarity_code
              : 'common',
          level: entry.level,
          values: {
            power: entry.power,
            control: entry.control,
            technique: entry.technique,
            pressure: entry.pressure,
            physical: entry.physical,
            agility: entry.agility,
            intelligence: entry.intelligence,
          },
        }));
      const descriptionPayload = json(
        stats.find((entry) => entry.profile_key.startsWith('game-common-'))?.stat_payload,
      );
      const description =
        descriptionPayload &&
        typeof descriptionPayload === 'object' &&
        'description' in descriptionPayload &&
        typeof descriptionPayload.description === 'string'
          ? descriptionPayload.description
          : null;
      return {
        ...summary,
        description,
        statProfiles,
        gender: row.gender,
        schoolYear: row.school_year,
        aliases: [...new Set(aliases.map((row) => row.name as string))].filter(
          (name) => name !== row.name,
        ),
        recordedTeams: Array.isArray(teams)
          ? teams.filter((team): team is string => typeof team === 'string' && !NON_TEAMS.has(team))
          : [],
        history: summary.appearances.map((work) => ({
          work,
          teams: [
            ...new Set(history.filter((h) => h.work_id === work.id).map((h) => h.name as string)),
          ],
        })),
        statistics: profile
          ? {
              level: profile.level,
              values: {
                power: profile.power,
                control: profile.control,
                technique: profile.technique,
                pressure: profile.pressure,
                physical: profile.physical,
                agility: profile.agility,
                intelligence: profile.intelligence,
              },
            }
          : null,
        learnsets: moves,
        variants: await summaries(variants),
        sourceUrl: url(row.source_url),
      };
    },
    async techniques(query) {
      const { sql, values } = techniqueWhere(query);
      const page = query.page ?? 1;
      const limit = query.limit ?? 24;
      const [items, count] = await Promise.all([
        rows(
          `SELECT ${TECH_FIELDS},ts.payload AS element_payload ${TECH_FROM} ${sql} ORDER BY t.name,t.id LIMIT ? OFFSET ?`,
          [...values, limit, (page - 1) * limit],
        ),
        rows(`SELECT COUNT(*) AS total ${TECH_FROM} ${sql}`, values),
      ]);
      const total = Number(count[0]?.total ?? 0);
      return {
        items: items.map((row) => ({
          ...technique(row),
          element: contextualElement(row.element_payload, query.work ?? 'VR', row.element),
        })),
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    },
    async technique(id) {
      const found = await rows(
        `SELECT ${TECH_FIELDS},t.description,t.granted_game_id,t.preview_url,t.preview_mime_type,ts.source_url,ts.payload AS element_payload ${TECH_FROM} WHERE t.id=? AND ${approved('t', 'ts')} AND ${publishedTechnique}`,
        [id],
      );
      const row = found[0];
      if (!row) return null;
      const [aliases, profiles, users] = await Promise.all([
        rows(
          `SELECT n.name FROM technique_names n LEFT JOIN source_records s ON s.id=n.source_record_id WHERE n.technique_id=? AND ${approved('n', 's')} ORDER BY n.name`,
          [id],
        ),
        rows(
          `SELECT p.id,p.profile_key,p.power,p.cost,p.parameters,w.id AS work_id,w.code AS work_code,w.name AS work_name,w.kind AS work_kind,
          r.code AS rarity_code,r.name AS rarity_name FROM technique_stat_profiles p JOIN game_contexts c ON c.id=p.context_id JOIN works w ON w.id=c.work_id
          LEFT JOIN rarities r ON r.id=p.rarity_id LEFT JOIN source_records s ON s.id=p.source_record_id
          WHERE p.technique_id=? AND ${approved('p', 's')} ORDER BY w.sort_order,p.id`,
          [id],
        ),
        this.players({ technique: id, limit: 24 }),
      ]);
      const numbers: TechniqueProfile[] = profiles.map((p) => {
        const parameters = json(p.parameters);
        return {
          id: p.id,
          key: p.profile_key,
          work: work(p, 'work_'),
          rarity: p.rarity_code ? { code: p.rarity_code, name: p.rarity_name } : null,
          power: p.power,
          cost: p.cost,
          element: contextualElement(row.element_payload, p.work_code, row.element),
          parameters:
            parameters && typeof parameters === 'object' && !Array.isArray(parameters)
              ? (parameters as Record<string, unknown>)
              : null,
        };
      });
      const granted = row.granted_game_id
        ? await rows(
            `SELECT ${TECH_FIELDS} ${TECH_FROM} WHERE t.game_id=? AND ${publishedTechnique} AND ${approved('t', 'ts')}`,
            [row.granted_game_id],
          )
        : [];
      const grantedBy = row.game_id
        ? await rows(
            `SELECT ${TECH_FIELDS} ${TECH_FROM} WHERE t.granted_game_id=? AND ${publishedTechnique} AND ${approved('t', 'ts')} ORDER BY t.name`,
            [row.game_id],
          )
        : [];
      const preview = url(row.preview_url);
      return {
        ...technique(row),
        aliases: [...new Set(aliases.map((n) => n.name as string))].filter(
          (name) => name !== row.name,
        ),
        description: row.description ?? null,
        grantedTechnique: granted[0] ? technique(granted[0]) : null,
        grantedBy: grantedBy.map(technique),
        profiles: numbers,
        users: users.items,
        userCount: users.total,
        preview: preview ? { url: preview, mimeType: row.preview_mime_type } : null,
        sourceUrl: url(row.source_url),
      };
    },
  };
}
