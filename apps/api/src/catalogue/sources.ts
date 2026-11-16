import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lastPage } from './official.js';

export const SNAPSHOT = '6c2d57bb55747d2506e9dbe3aa9df152bb75cdc9';
const RAW = `https://raw.githubusercontent.com/Zpidero/InazumaEleven_API/${SNAPSHOT}/data`;
export const CACHE = fileURLToPath(new URL('../../../../work/catalogue/', import.meta.url));
export interface Resource {
  id: string; url: string; retrievedAt: string; sha256: string; body: string;
}
export const digest = (body: string) => createHash('sha256').update(body).digest('hex');

export async function collectSources(options: { offline?: boolean; refresh?: boolean; directory?: string; log?: (message: string) => void } = {}) {
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
        if (meta.id !== id || meta.url !== url || meta.sha256 !== digest(body) || !Number.isFinite(Date.parse(meta.retrievedAt))) throw new Error('Cache invalide.');
        const resource = { ...meta, body };
        sources.set(id, resource);
        return resource;
      } catch (error) { if (options.offline) throw new Error(`Cache absent ou invalide : ${id}`, { cause: error }); }
    }
    if (options.offline) throw new Error(`Source absente : ${id}`);
    let resource: Resource | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, { headers: { 'User-Agent': 'KizunaDex-catalogue/0.1' }, signal: AbortSignal.timeout(30_000) });
        if (!response.ok) throw new Error(`HTTP ${response.status} : ${id}`);
        const body = await response.text();
        if (Buffer.byteLength(body) > 25_000_000) throw new Error(`Source trop volumineuse : ${id}`);
        resource = { id, url, retrievedAt: new Date().toISOString(), sha256: digest(body), body };
        break;
      } catch (error) { if (attempt === 2) throw error; }
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
    ...['players', 'techniques', 'keshins', 'mixmax', 'totems'].map(name => [name, `${RAW}/${name}.json`] as [string, string]),
    ...['PlayerData/IE', 'PlayerData/IE3', 'PlayerData/GO', 'PlayerData/CS', 'WazaData'].map(title => [
      `wiki-${title.replaceAll('/', '-')}`,
      `https://inazuma-eleven.fandom.com/api.php?${new URLSearchParams({ action: 'query', titles: `Module:${title}`, prop: 'revisions', rvprop: 'ids|content', rvslots: 'main', format: 'json', formatversion: '2' })}`,
    ] as [string, string]),
  ];
  for (let i = 0; i < fixed.length; i += 3) await Promise.all(fixed.slice(i, i + 3).map(([id, url]) => collect(id, url)));
  const official = (page: number) => `https://zukan.inazuma.jp/en/chara_list/?per_page=200&page=${page}`;
  const first = await collect('official-1', official(1));
  const pages = lastPage(first.body);
  for (let page = 2; page <= pages; page += 2) {
    await Promise.all(Array.from({ length: Math.min(2, pages - page + 1) }, (_, i) => collect(`official-${page + i}`, official(page + i))));
  }
  return sources;
}
