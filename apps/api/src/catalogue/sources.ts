import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lastPage, parseOfficial } from './official.js';
import { NON_TEAMS, playerModuleId, TEAM_PAGES, wikiQuery } from './team-sources.js';

export const SNAPSHOT = '6c2d57bb55747d2506e9dbe3aa9df152bb75cdc9';
export const GAME_SNAPSHOT = '05c979efe9ef4565468d725db67c0913394f63dd';
const RAW = `https://raw.githubusercontent.com/Zpidero/InazumaEleven_API/${SNAPSHOT}/data`;
export const CACHE = fileURLToPath(new URL('../../../../work/catalogue/', import.meta.url));
export interface Resource {
  id: string;
  url: string;
  retrievedAt: string;
  sha256: string;
  body: string;
}
export const digest = (body: string) => createHash('sha256').update(body).digest('hex');

export async function collectSources(
  options: {
    offline?: boolean;
    refresh?: boolean;
    directory?: string;
    log?: (message: string) => void;
  } = {},
) {
  const directory = options.directory ?? CACHE;
  await mkdir(directory, { recursive: true });
  const sources = new Map<string, Resource>();
  async function collect(id: string, url: string) {
    const bodyFile = resolve(directory, `${id}.body`);
    const metaFile = resolve(directory, `${id}.json`);
    if (!options.refresh || options.offline) {
      try {
        const body = await readFile(bodyFile, 'utf8');
        const meta = JSON.parse(await readFile(metaFile, 'utf8')) as Omit<Resource, 'body'>;
        if (
          meta.id !== id ||
          meta.url !== url ||
          meta.sha256 !== digest(body) ||
          !Number.isFinite(Date.parse(meta.retrievedAt))
        )
          throw new Error('Cache invalide.');
        const resource = { ...meta, body };
        sources.set(id, resource);
        return resource;
      } catch (error) {
        if (options.offline) throw new Error(`Cache absent ou invalide : ${id}`, { cause: error });
      }
    }
    if (options.offline) throw new Error(`Source absente : ${id}`);
    let resource: Resource | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Hakuren-catalogue/0.1' },
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} : ${id}`);
        const body = await response.text();
        if (Buffer.byteLength(body) > 25_000_000)
          throw new Error(`Source trop volumineuse : ${id}`);
        resource = { id, url, retrievedAt: new Date().toISOString(), sha256: digest(body), body };
        break;
      } catch (error) {
        if (attempt === 2) throw error;
      }
    }
    if (!resource) throw new Error(`Source indisponible : ${id}`);
    await writeFile(bodyFile, resource.body);
    const { body, ...meta } = resource;
    await writeFile(metaFile, JSON.stringify(meta, null, 2) + '\n');
    sources.set(id, resource);
    options.log?.(`Collecté : ${id}`);
    return resource;
  }
  const fixed: [string, string][] = [
    ...['fr', 'en', 'ja'].map(
      (locale) =>
        [
          `game-${locale}`,
          `https://raw.githubusercontent.com/salty-max/kizuna/${GAME_SNAPSHOT}/data/raw/dataminer/ievr.${locale}.json`,
        ] as [string, string],
    ),
    [
      'game-equipment-images',
      `https://raw.githubusercontent.com/salty-max/kizuna/${GAME_SNAPSHOT}/data/raw/equipment-images.json`,
    ],
    ...['players', 'techniques', 'keshins', 'mixmax', 'totems'].map(
      (name) => [name, `${RAW}/${name}.json`] as [string, string],
    ),
    ...['IE', 'IE2', 'IE3', 'GO', 'CS', 'GX', 'AT', 'OK', 'VR'].map(
      (module) =>
        [
          playerModuleId(module),
          wikiQuery({
            action: 'query',
            titles: `Module:PlayerData/${module}`,
            prop: 'revisions',
            rvprop: 'ids|content',
            rvslots: 'main',
          }),
        ] as [string, string],
    ),
    ...['WazaData', 'CoachData', 'ManagerData'].map(
      (title) =>
        [
          `wiki-${title.toLowerCase()}`,
          `https://inazuma-eleven.fandom.com/api.php?${new URLSearchParams({ action: 'query', titles: `Module:${title}`, prop: 'revisions', rvprop: 'ids|content', rvslots: 'main', format: 'json', formatversion: '2' })}`,
        ] as [string, string],
    ),
  ];
  for (let i = 0; i < fixed.length; i += 3)
    await Promise.all(fixed.slice(i, i + 3).map(([id, url]) => collect(id, url)));
  const official = (page: number) =>
    `https://zukan.inazuma.jp/en/chara_list/?per_page=200&page=${page}`;
  const first = await collect('official-1', official(1));
  const pages = lastPage(first.body);
  for (let page = 2; page <= pages; page += 2) {
    await Promise.all(
      Array.from({ length: Math.min(2, pages - page + 1) }, (_, i) =>
        collect(`official-${page + i}`, official(page + i)),
      ),
    );
  }
  const players = [...sources.values()]
    .filter((source) => /^official-\d+$/.test(source.id))
    .flatMap((source) => parseOfficial(source.body));
  const names = [
    ...new Set(
      players
        .filter((player) => player.teams.some((team) => !NON_TEAMS.has(team)))
        .map((player) => player.name),
    ),
  ].sort();
  const teams = [
    ...new Set(players.flatMap((player) => player.teams).filter((team) => !NON_TEAMS.has(team))),
  ].sort();
  const titles = [
    ...new Set(
      teams.flatMap((team) => (Object.hasOwn(TEAM_PAGES, team) ? TEAM_PAGES[team]! : [team])),
    ),
  ].sort();
  const extra: [string, string][] = [];
  for (let index = 0; index < names.length; index += 50)
    extra.push([
      `wiki-names-${index / 50 + 1}`,
      wikiQuery({
        action: 'query',
        titles: names.slice(index, index + 50).join('|'),
        redirects: '1',
        prop: 'info',
      }),
    ]);
  for (let index = 0; index < titles.length; index += 30)
    extra.push([
      `wiki-teams-${index / 30 + 1}`,
      wikiQuery({
        action: 'query',
        titles: titles.slice(index, index + 30).join('|'),
        redirects: '1',
        prop: 'revisions',
        rvprop: 'ids|content',
        rvslots: 'main',
      }),
    ]);
  for (let index = 0; index < extra.length; index += 3)
    await Promise.all(extra.slice(index, index + 3).map(([id, url]) => collect(id, url)));
  return sources;
}
