import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { FAMILIES } from './curation.js';
import { WORKS } from './official.js';
import { element, type CataloguePlan, type RecordSpec } from './prepare.js';
import { digest } from './sources.js';

const SOURCES = [
  ['level5-codex', 'LEVEL-5 Character Database', 'https://zukan.inazuma.jp/en/'],
  [
    'vr-community',
    'Inazuma Eleven VR community API',
    'https://github.com/Zpidero/InazumaEleven_API',
  ],
  [
    'inazuma-wiki',
    'Inazuma Eleven Wiki (CC-BY-SA)',
    'https://inazuma-eleven.fandom.com/wiki/Module:PlayerData',
  ],
  ['kizunadex-curation', 'KizunaDex explicit mappings', null],
] as const;
const slug = (kind: string, key: string) => `${kind}-${digest(key).slice(0, 24)}`;
const key = (source: number, external: string) => JSON.stringify([source, external]);
function bindings(values: unknown[]): (string | number | null)[] {
  return values.map((value) => {
    if (
      value === null ||
      typeof value === 'string' ||
      (typeof value === 'number' && Number.isFinite(value))
    )
      return value;
    throw new Error('Paramètre SQL absent ou invalide.');
  });
}
async function put(
  db: PoolConnection,
  table: string,
  values: Record<string, unknown>,
  updates: string[] = [],
): Promise<number> {
  const columns = Object.keys(values);
  for (const identifier of [table, ...columns, ...updates])
    if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) throw new Error('Identifiant SQL invalide.');
  const sql = `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(',')}) VALUES (${columns.map(() => '?').join(',')}) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)${updates.map((c) => `,\`${c}\`=VALUES(\`${c}\`)`).join('')}`;
  const [result] = await db.execute<ResultSetHeader>(sql, bindings(Object.values(values)));
  if (!result.insertId) throw new Error(`Identifiant absent après écriture : ${table}`);
  return result.insertId;
}

export async function importCatalogue(
  pool: Pool,
  plan: CataloguePlan,
  log: (message: string) => void = () => {},
): Promise<void> {
  const db = await pool.getConnection();
  let locked = false;
  let reusable = true;
  try {
    const [lock] = await db.execute<RowDataPacket[]>(
      `SELECT GET_LOCK('kizunadex:catalogue-import', 5) AS acquired`,
    );
    if (Number(lock[0]?.acquired) !== 1)
      throw new Error('Un autre import du catalogue est en cours.');
    locked = true;
    await db.beginTransaction();
    const sources = new Map<string, number>();
    for (const [code, name, url] of SOURCES)
      sources.set(code, await put(db, 'data_sources', { code, name, url }));
    const curation: RecordSpec = {
      source: 'kizunadex-curation',
      kind: 'mapping',
      key: 'character-families',
      version: `sha256:${digest(JSON.stringify(FAMILIES))}`,
      url: 'apps/api/src/catalogue/curation.ts',
      retrievedAt: new Date().toISOString(),
      payload: FAMILIES,
      status: 'verified',
      note: 'Explicit ID groups reviewed against the official identities.',
    };
    const records = new Map<RecordSpec, number>();
    for (const record of [...plan.records, curation]) {
      const payload = JSON.stringify(record.payload);
      const id = await put(db, 'source_records', {
        source_id: sources.get(record.source),
        entity_kind: record.kind,
        external_key: record.key,
        source_version: record.version,
        source_url: record.url,
        retrieved_at: record.retrievedAt.slice(0, 23).replace('T', ' '),
        payload,
        sha256: digest(payload),
        review_status: record.status,
        review_note: record.note,
      });
      records.set(record, id);
    }
    const reviewed = new Map<number, string>();
    const ids = [...new Set(records.values())];
    for (let i = 0; i < ids.length; i += 1000) {
      const batch = ids.slice(i, i + 1000);
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT id, review_status FROM source_records WHERE id IN (${batch.map(() => '?').join(',')})`,
        batch,
      );
      for (const row of rows) reviewed.set(row.id, row.review_status);
    }
    function verified(record: RecordSpec): number {
      const id = records.get(record);
      if (!id || record.status !== 'verified' || reviewed.get(id) !== 'verified')
        throw new Error(`Source non validée : ${record.kind}/${record.key}`);
      return id;
    }
    const works = new Map<string, number>();
    for (const [index, [code, name]] of WORKS.entries())
      works.set(
        code,
        await put(
          db,
          'works',
          {
            code,
            name,
            kind: code === 'ARES' || code === 'ORION' ? 'anime' : 'game',
            sort_order: index,
            source_record_id: verified(curation),
          },
          ['kind'],
        ),
      );
    const workByName = new Map(WORKS.map(([code, name]) => [name as string, works.get(code)!]));
    const rarities = new Map<string, number>();
    for (const [index, code] of ['hero', 'basara'].entries())
      rarities.set(
        code,
        await put(db, 'rarities', { code, name: code.toUpperCase(), sort_order: index }),
      );
    const contexts = new Map<string, number>();
    async function context(work: string, mode = 'standard', version = 'unspecified') {
      const cacheKey = JSON.stringify([work, mode, version]);
      let id = contexts.get(cacheKey);
      if (!id) {
        if (!works.has(work)) throw new Error(`Œuvre inconnue : ${work}`);
        id = await put(db, 'game_contexts', {
          work_id: works.get(work),
          mode_code: mode,
          game_version: version,
        });
        contexts.set(cacheKey, id);
      }
      return id;
    }
    const families = new Map<number, number>();
    for (const family of FAMILIES) {
      const present = plan.variants.filter((variant) =>
        (family.ids as readonly number[]).includes(Number(variant.externalId)),
      );
      if (!present.length) continue;
      if (present.some((variant) => variant.official.name !== family.name))
        throw new Error('Correspondance de personnage modifiée.');
      const id = await put(db, 'characters', {
        slug: family.slug,
        name: family.name,
        source_record_id: verified(curation),
      });
      await db.execute(
        `INSERT INTO character_names (character_id, locale, name, is_preferred, source_record_id)
        VALUES (?, 'en', ?, 1, ?), (?, 'ja-Latn', ?, 1, ?)
        ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [id, family.name, verified(curation), id, family.japanese, verified(curation)],
      );
      for (const variant of present) families.set(Number(variant.externalId), id);
    }
    const [externalRows] = await db.execute<RowDataPacket[]>(
      `SELECT e.external_key, e.variant_id, v.character_id FROM variant_external_ids e
      JOIN player_variants v ON v.id=e.variant_id WHERE e.source_id=?`,
      [sources.get('level5-codex')!],
    );
    const existingVariants = new Map(externalRows.map((row) => [row.external_key as string, row]));
    const variants = new Map<string, number>();
    const appearances = new Map<string, number>();
    const teams = new Map<string, number>();
    const vr = await context('VR');
    for (const variant of plan.variants) {
      const official = variant.official;
      const prior = existingVariants.get(variant.externalId);
      const family = families.get(Number(variant.externalId));
      if (prior?.character_id && family && prior.character_id !== family)
        throw new Error(`Identité existante incompatible : ${variant.externalId}`);
      const sourceId = verified(variant.record);
      const values = {
        id: prior?.variant_id ?? null,
        character_id: family ?? prior?.character_id ?? null,
        name: official.name,
        variant_label: `${official.nickname} · ${official.ageGroup} · ${official.origin}`,
        origin_work_id: workByName.get(official.origin),
        element: element(official.element),
        position: official.position,
        role: official.role,
        gender: official.gender === 'Unknown' ? null : official.gender.toLowerCase(),
        age_group: official.ageGroup,
        school_year: official.schoolYear || null,
        portrait_url: variant.portrait,
        source_record_id: sourceId,
      };
      if (values.variant_label.length > 191) throw new Error('Libellé de variante trop long.');
      const id = await put(
        db,
        'player_variants',
        values,
        Object.keys(values).filter((column) => column !== 'id'),
      );
      variants.set(variant.externalId, id);
      const externalSources = [
        'level5-codex',
        ...(variant.community?.status === 'verified' ? ['vr-community'] : []),
      ];
      for (const source of externalSources) {
        await db.execute(
          `INSERT INTO variant_external_ids (source_id, external_key, variant_id) VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE external_key=VALUES(external_key)`,
          [sources.get(source)!, variant.externalId, id],
        );
        const [actual] = await db.execute<RowDataPacket[]>(
          'SELECT variant_id FROM variant_external_ids WHERE source_id=? AND external_key=?',
          [sources.get(source)!, variant.externalId],
        );
        if (actual[0]?.variant_id !== id)
          throw new Error('Identifiant externe déjà rattaché à une autre variante.');
      }
      for (const record of [variant.record, variant.community].filter(
        (r): r is RecordSpec => !!r,
      )) {
        await db.execute(
          `INSERT INTO variant_source_links (variant_id, source_record_id, scope, match_status) VALUES (?, ?, 'identity', ?)
          ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
          [id, records.get(record)!, record.status === 'verified' ? 'verified' : 'rejected'],
        );
      }
      for (const work of official.appearances)
        appearances.set(
          `${variant.externalId}/${work}`,
          await put(
            db,
            'variant_appearances',
            { variant_id: id, work_id: works.get(work), source_record_id: sourceId },
            ['source_record_id'],
          ),
        );
      for (const name of official.teams) {
        if (!teams.has(name))
          teams.set(
            name,
            await put(db, 'historical_teams', {
              slug: slug('team', name),
              name,
              source_record_id: sourceId,
            }),
          );
      }
      if (variant.stats && variant.statsRecord) {
        const [power, control, technique, pressure, physical, agility, intelligence] =
          variant.stats;
        const values = {
          variant_id: id,
          context_id: vr,
          profile_key: 'base-lv50',
          rarity_id: null,
          level: 50,
          power,
          control,
          technique,
          pressure,
          physical,
          agility,
          intelligence,
          source_record_id: verified(variant.statsRecord),
        };
        await put(db, 'player_stat_profiles', values, [
          'power',
          'control',
          'technique',
          'pressure',
          'physical',
          'agility',
          'intelligence',
          'source_record_id',
        ]);
      }
    }
    log(`${variants.size} variantes préparées.`);
    const [techniqueRows] = await db.query<RowDataPacket[]>(
      'SELECT source_id, external_key, technique_id FROM technique_external_ids',
    );
    const existingTechniques = new Map(
      techniqueRows.map((row) => [
        key(row.source_id, row.external_key),
        row.technique_id as number,
      ]),
    );
    const techniques = new Map<string, number>();
    for (const technique of plan.techniques) {
      const sourceId = sources.get(technique.record.source)!;
      const external = `${technique.record.kind}/${technique.record.key}`;
      if (external.length > 191) throw new Error('Identifiant de technique trop long.');
      const values = {
        id: existingTechniques.get(key(sourceId, external)) ?? null,
        slug: slug('technique', JSON.stringify([technique.record.source, external])),
        name: technique.name,
        category: technique.category,
        element: technique.element,
        preview_url: technique.preview,
        preview_mime_type: technique.preview?.toLowerCase().endsWith('.mp4')
          ? 'video/mp4'
          : technique.preview?.toLowerCase().endsWith('.webm')
            ? 'video/webm'
            : null,
        source_record_id: verified(technique.record),
      };
      const id = await put(db, 'techniques', values, [
        'name',
        'category',
        'element',
        'preview_url',
        'preview_mime_type',
        'source_record_id',
      ]);
      techniques.set(technique.key, id);
      await db.execute(
        `INSERT INTO technique_external_ids (source_id, external_key, technique_id) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE external_key=VALUES(external_key)`,
        [sourceId, external, id],
      );
      for (const name of new Set(
        [technique.name, technique.wikiName].filter((name): name is string => !!name),
      )) {
        await db.execute(
          `INSERT INTO technique_names (technique_id, locale, name, source_record_id) VALUES (?, 'und', ?, ?)
          ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
          [id, name, verified(technique.record)],
        );
      }
    }
    for (const profile of plan.profiles) {
      const values = {
        technique_id: techniques.get(profile.technique),
        context_id: await context(profile.work),
        profile_key: profile.key,
        rarity_id: profile.rarity ? rarities.get(profile.rarity) : null,
        power: profile.power,
        cost: profile.cost,
        parameters: profile.parameters == null ? null : JSON.stringify(profile.parameters),
        source_record_id: verified(profile.record),
      };
      await put(db, 'technique_stat_profiles', values, [
        'power',
        'cost',
        'parameters',
        'source_record_id',
      ]);
    }
    const learnsetKey = (
      variant: number,
      source: number,
      kind: string,
      external: string,
      entry: string,
    ) => JSON.stringify([variant, source, kind, external, entry]);
    const [learnsetRows] = await db.query<
      RowDataPacket[]
    >(`SELECT l.id, l.variant_id, l.source_entry_key, r.source_id, r.entity_kind, r.external_key
      FROM variant_learnsets l JOIN source_records r ON r.id=l.source_record_id`);
    const existingLearnsets = new Map(
      learnsetRows.map((row) => [
        learnsetKey(
          row.variant_id,
          row.source_id,
          row.entity_kind,
          row.external_key,
          row.source_entry_key,
        ),
        row.id as number,
      ]),
    );
    for (const record of plan.records.filter(
      (record) =>
        record.source === 'inazuma-wiki' &&
        record.kind === 'learnset' &&
        record.status === 'verified',
    )) {
      verified(record);
      await db.execute(
        `UPDATE variant_learnsets l JOIN source_records r ON r.id=l.source_record_id
        SET l.is_current=0 WHERE r.source_id=? AND r.entity_kind=? AND r.external_key=?`,
        [sources.get(record.source)!, record.kind, record.key],
      );
    }
    for (const learnset of plan.learnsets) {
      const variant = variants.get(learnset.externalId);
      if (!variant) throw new Error('Variante de moveset absente du catalogue.');
      const previousId = existingLearnsets.get(
        learnsetKey(
          variant,
          sources.get(learnset.record.source)!,
          learnset.record.kind,
          learnset.record.key,
          learnset.entryKey,
        ),
      );
      const values = {
        id: previousId ?? null,
        variant_id: variant,
        technique_id: techniques.get(learnset.technique),
        context_id: await context(learnset.work, learnset.mode, learnset.version),
        source_record_id: verified(learnset.record),
        source_entry_key: learnset.entryKey,
        source_section: learnset.section,
        unlock_level: learnset.level,
        alternate_path: Number(learnset.alternatePath),
        basara_only: learnset.basaraOnly === null ? null : Number(learnset.basaraOnly),
        rarity_scope: learnset.rarityScope,
        source_flags: JSON.stringify(learnset.flags),
        is_current: 1,
      };
      const id = await put(
        db,
        'variant_learnsets',
        values,
        Object.keys(values).filter((column) => column !== 'id'),
      );
      if (previousId) await db.execute('DELETE FROM learnset_rarities WHERE learnset_id=?', [id]);
      await db.execute(
        `INSERT INTO variant_source_links (variant_id, source_record_id, scope, match_status) VALUES (?, ?, 'techniques', 'verified')
        ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [variant, verified(learnset.record)],
      );
      for (const rarity of learnset.rarities) {
        const rarityId = rarities.get(rarity);
        if (!rarityId) throw new Error('Rareté de moveset non reconnue.');
        await db.execute(
          `INSERT INTO learnset_rarities (learnset_id, rarity_id, source_record_id) VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
          [id, rarityId, verified(learnset.record)],
        );
        if (learnset.section === 'VRH' || learnset.section === 'VRB')
          await db.execute(
            `INSERT INTO variant_rarities (variant_id, rarity_id, source_record_id) VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
            [variant, rarityId, verified(learnset.record)],
          );
      }
    }
    await db.execute(
      `DELETE m FROM appearance_teams m JOIN source_records r ON r.id=m.source_record_id
      WHERE r.source_id=? AND r.entity_kind='roster_membership'`,
      [sources.get('inazuma-wiki')!],
    );
    for (const membership of plan.memberships) {
      const appearance = appearances.get(`${membership.id}/${membership.work}`);
      const team = teams.get(membership.team);
      if (!appearance || !team)
        throw new Error('Appartenance historique sans apparition ou équipe.');
      await db.execute(
        `INSERT INTO appearance_teams (appearance_id, historical_team_id, source_record_id) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [appearance, team, verified(membership.record)],
      );
    }
    await db.execute(
      `DELETE a FROM variant_rarities a JOIN source_records r ON r.id=a.source_record_id
      WHERE r.source_id=? AND r.entity_kind='player_rarities'`,
      [sources.get('vr-community')!],
    );
    for (const availability of plan.rarities) {
      const variant = variants.get(availability.externalId);
      const rarity = rarities.get(availability.rarity);
      if (!variant || !rarity)
        throw new Error('Disponibilité de rareté sans joueur ou rareté connue.');
      await db.execute(
        `INSERT INTO variant_rarities (variant_id, rarity_id, source_record_id) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [variant, rarity, verified(availability.record)],
      );
    }
    for (const record of plan.records.filter(
      (r) => r.source === 'vr-community' && r.kind === 'player_techniques',
    )) {
      const variant = variants.get(record.key);
      if (variant)
        await db.execute(
          `INSERT INTO variant_source_links (variant_id, source_record_id, scope, match_status) VALUES (?, ?, 'techniques', ?)
        ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
          [variant, records.get(record)!, record.status === 'quarantined' ? 'rejected' : 'pending'],
        );
    }
    await db.commit();
  } catch (error) {
    try {
      await db.rollback();
    } catch {
      reusable = false;
    }
    throw error;
  } finally {
    try {
      if (locked) await db.execute(`SELECT RELEASE_LOCK('kizunadex:catalogue-import')`);
    } catch {
      reusable = false;
    }
    if (reusable) db.release();
    else db.destroy();
  }
}
