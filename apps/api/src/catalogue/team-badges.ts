import { TEAM_PAGES } from './team-sources.js';
import type { Resource } from './sources.js';

export interface TeamBadge {
  name: string;
  file: string;
  sourceUrl: string;
}
export function teamBadgeFiles(resources: Map<string, Resource>): TeamBadge[] {
  const pages = new Map<string, { title: string; content: string }>();
  const aliases = new Map<string, string>();
  for (const resource of resources.values()) {
    if (!/^wiki-teams-\d+$/.test(resource.id)) continue;
    const query = JSON.parse(resource.body).query;
    for (const alias of [...(query?.normalized ?? []), ...(query?.redirects ?? [])])
      aliases.set(alias.from, alias.to);
    for (const page of query?.pages ?? []) {
      const content = page.revisions?.[0]?.slots?.main?.content;
      if (typeof content === 'string') pages.set(page.title, { title: page.title, content });
    }
  }
  const result: TeamBadge[] = [];
  const names = new Set([...pages.keys(), ...aliases.keys(), ...Object.keys(TEAM_PAGES)]);
  for (const name of names) {
    const titles = Object.hasOwn(TEAM_PAGES, name) ? TEAM_PAGES[name]! : [name];
    for (const title of titles) {
      let key = title;
      const seen = new Set<string>();
      while (aliases.has(key) && !seen.has(key)) {
        seen.add(key);
        key = aliases.get(key)!;
      }
      const page = pages.get(key);
      if (!page) continue;
      const content = page.content.replace(/\{\{PAGENAME\}\}/g, page.title);
      const candidates = [...content.matchAll(/\[\[(?:File|Image):([^|\]\n]*emblem[^|\]\n]*)/gi)]
        .map((match) => match[1]!.trim())
        .filter(
          (file) => /\.(?:png|webp|svg|jpe?g)$/i.test(file) && !/wear|uniform|preview/i.test(file),
        );
      candidates.sort((a, b) => Number(!/\(VR\)/i.test(a)) - Number(!/\(VR\)/i.test(b)));
      if (candidates[0]) {
        result.push({
          name,
          file: `File:${candidates[0]}`,
          sourceUrl: `https://inazuma-eleven.fandom.com/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
        });
        break;
      }
    }
  }
  return result;
}
export function teamBadgeImages(resources: Map<string, Resource>) {
  const images = new Map<string, string>();
  const aliases = new Map<string, string>();
  for (const resource of resources.values()) {
    if (!/^wiki-team-images-\d+$/.test(resource.id)) continue;
    const query = JSON.parse(resource.body).query;
    for (const alias of [...(query?.normalized ?? []), ...(query?.redirects ?? [])])
      aliases.set(alias.from, alias.to);
    for (const page of query?.pages ?? []) {
      const value = page.imageinfo?.[0]?.thumburl ?? page.imageinfo?.[0]?.url;
      if (typeof value === 'string' && /^https:\/\/static\.wikia\.nocookie\.net\//.test(value))
        images.set(page.title, value);
    }
  }
  return teamBadgeFiles(resources).flatMap((badge) => {
    const imageUrl = images.get(aliases.get(badge.file) ?? badge.file);
    return imageUrl ? [{ ...badge, imageUrl }] : [];
  });
}
