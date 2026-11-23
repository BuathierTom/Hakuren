import type { PoolConnection } from 'mysql2/promise';
import type { Passive, PassiveSource, PlayStyle } from '../../../../shared/catalogue.js';
import { teamBadgeImages } from './team-badges.js';
import type { Resource } from './sources.js';

export interface CatalogueExtras {
  passives: Omit<Passive, 'id'>[];
  badges: ReturnType<typeof teamBadgeImages>;
}
const styles = new Set(['breach', 'tension', 'counter', 'bond', 'rough_play', 'justice']);
export function prepareExtras(resources: Map<string, Resource>): CatalogueExtras {
  const resource = resources.get('game-fr');
  const bundle = resource ? JSON.parse(resource.body.replace(/^\uFEFF/, '')) : {};
  const passives: Omit<Passive, 'id'>[] = [];
  const seen = new Set<string>();
  const gameIds = new Set<number>();
  for (const raw of bundle.passives ?? []) {
    if (typeof raw.string_id !== 'string' || !raw.string_id || /^swap/i.test(raw.string_id))
      continue;
    if (
      !Number.isSafeInteger(raw.id) ||
      raw.id < -2147483648 ||
      raw.id > 4294967295 ||
      gameIds.has(raw.id) ||
      !Number.isFinite(raw.value) ||
      raw.value < 0 ||
      Math.abs(raw.value) > 99999 ||
      seen.has(raw.string_id)
    )
      throw new Error('Passif de jeu invalide.');
    seen.add(raw.string_id);
    gameIds.add(raw.id);
    const value = Math.round(raw.value * 10000) / 10000;
    const template = String(raw.name ?? '')
      .replace(/\[C[^\]]*\]/g, '')
      .replace(/<VALUE>/gi, '…')
      .replace(/<[^>]*>/g, '')
      .replace(/\\+n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!template || /必殺|test_|^\?+$/i.test(template)) continue;
    const source: PassiveSource = /^(?:b?mps)/i.test(raw.string_id)
      ? 'manager'
      : /^(?:b?cps)/i.test(raw.string_id)
        ? 'coach'
        : /^hps/i.test(raw.string_id)
          ? 'custom'
          : 'player';
    const tiers = Array.isArray(raw.tiers) ? raw.tiers : [];
    const tier = tiers[0];
    passives.push({
      gameId: String(raw.id),
      stringId: raw.string_id,
      name: template,
      description: template.replaceAll('…', String(value).replace('.', ',')),
      source,
      playStyle: styles.has(raw.build) ? (raw.build as PlayStyle) : null,
      value,
      unit: template.includes('%') ? 'percent' : 'points',
      icon: Number.isInteger(raw.icon) && raw.icon >= 0 && raw.icon < 1000 ? raw.icon : null,
      family: Number.isInteger(tier?.family) ? tier.family : null,
      tier: Number.isInteger(tier?.tier) ? tier.tier : null,
      sourceUrl: resource!.url,
    });
  }
  return { passives, badges: teamBadgeImages(resources) };
}
export async function importExtras(db: PoolConnection, extras: CatalogueExtras) {
  if (extras.passives.length) {
    await db.execute('UPDATE catalogue_passives SET is_published=0');
    for (const passive of extras.passives) {
      await db.execute(
        `INSERT INTO catalogue_passives (game_id,string_id,name,description,source,play_style,value,unit,icon,family,tier,source_url,is_published)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),source=VALUES(source),play_style=VALUES(play_style),value=VALUES(value),unit=VALUES(unit),icon=VALUES(icon),family=VALUES(family),tier=VALUES(tier),source_url=VALUES(source_url),is_published=1`,
        [
          passive.gameId,
          passive.stringId,
          passive.name,
          passive.description,
          passive.source,
          passive.playStyle,
          passive.value,
          passive.unit,
          passive.icon,
          passive.family,
          passive.tier,
          passive.sourceUrl,
        ],
      );
    }
  }
  for (const badge of extras.badges) {
    await db.execute(
      `INSERT INTO team_badges (historical_team_id,image_url,source_url)
      SELECT id,?,? FROM historical_teams WHERE name=? ON DUPLICATE KEY UPDATE image_url=VALUES(image_url),source_url=VALUES(source_url)`,
      [badge.imageUrl, badge.sourceUrl, badge.name],
    );
  }
}
