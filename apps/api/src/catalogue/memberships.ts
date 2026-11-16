import { WIKI_MAPPINGS } from './curation.js';
import { WORKS } from './official.js';
import type { CataloguePlan, RecordSpec, VariantSpec } from './prepare.js';
import { digest, type Resource } from './sources.js';
import { NON_TEAMS, PRIMARY_ROSTER_WORKS, TEAM_PAGES } from './team-sources.js';
import { literalTable, pageName } from './wiki.js';

interface WikiPage {
  title: string;
  missing?: boolean;
  revisions?: { revid: number; slots: { main: { content: string } } }[];
}

interface WikiResponse {
  query?: {
    pages?: WikiPage[];
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
  };
}

interface WikiEntry {
  module: string;
  key: string;
  page: string;
}

const codes: Record<string, string> = {
  AT: 'ARES',
  OK: 'ORION',
  TO: 'IE3',
  SP: 'IE3',
  BO: 'IE3',
  SH: 'GO',
  DA: 'GO',
  NE: 'CS',
  RA: 'CS',
};
const workCode = (value: string) => (Object.hasOwn(codes, value) ? codes[value]! : value);

function titleWork(title: string): string | null {
  const value = title.replace(/['\[\]]/g, '').trim();
  const labels: [RegExp, string][] = [
    [/^Inazuma Eleven(?: Eiyuutachi no)?(?:[: ]+)Victory Road$/i, 'VR'],
    [/^Inazuma Eleven GO Galaxy(?:\b.*)?$/i, 'GX'],
    [/^Inazuma Eleven GO (?:2: Chrono Stone|Chrono Stones)(?:\b.*)?$/i, 'CS'],
    [/^Inazuma Eleven GO(?:\b.*)?$/i, 'GO'],
    [/^Inazuma Eleven 3(?:\b.*)?$/i, 'IE3'],
    [/^Inazuma Eleven 2(?:\b.*)?$/i, 'IE2'],
    [/^Inazuma Eleven Ares(?:\b.*)?$/i, 'ARES'],
    [/^Inazuma Eleven Orion(?:\b.*)?$/i, 'ORION'],
    [/^Inazuma Eleven$/i, 'IE'],
  ];
  return labels.find(([pattern]) => pattern.test(value))?.[1] ?? null;
}

function tabContexts(content: string): { start: number; end: number; work: string }[] {
  const result: { start: number; end: number; work: string }[] = [];
  for (const match of content.matchAll(/\{\{Tab\s*\|/g)) {
    let depth = 1;
    let links = 0;
    let tabbers = 0;
    let start = match.index + match[0].length;
    let previous: string | null = null;
    for (let cursor = start; cursor < content.length; cursor++) {
      if (content.startsWith('<tabber>', cursor)) {
        tabbers++;
        cursor += 7;
      } else if (content.startsWith('</tabber>', cursor)) {
        tabbers--;
        cursor += 8;
      } else if (content.startsWith('{{', cursor)) {
        depth++;
        cursor++;
      } else if (content.startsWith('}}', cursor)) {
        depth--;
        if (!depth) {
          if (previous) result.push({ start, end: cursor, work: previous });
          break;
        }
        cursor++;
      } else if (content.startsWith('[[', cursor)) {
        links++;
        cursor++;
      } else if (content.startsWith(']]', cursor)) {
        links--;
        cursor++;
      } else if (content[cursor] === '|' && depth === 1 && links === 0 && tabbers === 0) {
        if (previous) result.push({ start, end: cursor, work: previous });
        previous = titleWork(content.slice(start, cursor));
        start = cursor + 1;
      }
    }
  }
  for (const match of content.matchAll(/^(={2,6})\s*([^=\n]+?)\s*\1\s*$/gm)) {
    const work = titleWork(match[2]!);
    if (!work) continue;
    const remaining = content.slice(match.index + match[0].length);
    const next = new RegExp(`^={2,${match[1]!.length}}[^=]`, 'm').exec(remaining);
    result.push({
      start: match.index,
      end: next ? match.index + match[0].length + next.index : content.length,
      work,
    });
  }
  return result;
}

function response(resource: Resource): WikiResponse {
  return JSON.parse(resource.body) as WikiResponse;
}

function target(title: string, data: WikiResponse): string | null {
  const links = new Map(
    [...(data.query?.normalized ?? []), ...(data.query?.redirects ?? [])].map((link) => [
      link.from,
      link.to,
    ]),
  );
  const seen = new Set<string>();
  let current = title;
  while (links.has(current)) {
    if (seen.has(current)) return null;
    seen.add(current);
    current = links.get(current)!;
  }
  return data.query?.pages?.some((page) => page.title === current && !page.missing)
    ? current
    : null;
}

export function rosterTemplates(content: string): Record<string, string>[] {
  const result: Record<string, string>[] = [];
  const contexts = tabContexts(content);
  const first = new Set<string>();
  for (const match of content.matchAll(
    /\{\{#invoke:(MemberTable|CoachTable|ManagerTable)\|main\b/gi,
  )) {
    let depth = 1;
    let index = match.index + match[0].length;
    const start = index;
    while (index < content.length && depth) {
      if (content.startsWith('{{', index)) {
        depth++;
        index += 2;
      } else if (content.startsWith('}}', index)) {
        depth--;
        if (depth) index += 2;
      } else index++;
    }
    if (depth) continue;
    const body = content.slice(start, index);
    const fields: Record<string, string> = Object.create(null);
    fields.context =
      contexts
        .filter((context) => context.start <= match.index && context.end > match.index)
        .sort((a, b) => a.end - a.start - (b.end - b.start))[0]?.work ?? '';
    fields.primary = first.has(match[1]!) ? 'false' : 'true';
    first.add(match[1]!);
    let braces = 0;
    let brackets = 0;
    let fieldStart = 0;
    for (let cursor = 0; cursor <= body.length; cursor++) {
      if (body.startsWith('{{', cursor)) {
        braces++;
        cursor++;
      } else if (body.startsWith('}}', cursor)) {
        braces--;
        cursor++;
      } else if (body.startsWith('[[', cursor)) {
        brackets++;
        cursor++;
      } else if (body.startsWith(']]', cursor)) {
        brackets--;
        cursor++;
      } else if (
        cursor === body.length ||
        (body[cursor] === '|' && braces === 0 && brackets === 0)
      ) {
        const field = body.slice(fieldStart, cursor).trim();
        const equal = field.indexOf('=');
        if (equal > 0) fields[field.slice(0, equal).trim()] = field.slice(equal + 1).trim();
        fieldStart = cursor + 1;
      }
    }
    result.push(fields);
  }
  return result;
}

function debutWork(content: string, title: string): string | null {
  const game = content.match(
    /\|debut_game\s*=\s*\{\{Media\|(?:games?|series)\|([A-Z0-9]+)\}\}/,
  )?.[1];
  if (game && WORKS.some(([code]) => code === workCode(game))) return workCode(game);
  const anime = content.match(/\|debut_anime\s*=([^\n]+)/)?.[1] ?? '';
  if (/Orion/.test(anime + title)) return 'ORION';
  if (/Ares|Outer Code|\|RL\}\}/.test(anime + title)) return 'ARES';
  return null;
}

export function prepareMemberships(
  resources: Map<string, Resource>,
  variants: VariantSpec[],
): Pick<CataloguePlan, 'memberships' | 'records'> {
  const records: RecordSpec[] = [];
  const memberships: CataloguePlan['memberships'] = [];
  const aliases = new Map<string, string>();
  const pages = new Map<string, { page: WikiPage; resource: Resource }>();
  const requestedTeams = new Map<string, string>();
  for (const resource of resources.values()) {
    if (!/^wiki-(names|teams)-\d+$/.test(resource.id)) continue;
    const data = response(resource);
    const requested = new URL(resource.url).searchParams.get('titles')?.split('|') ?? [];
    for (const title of requested) {
      const destination = target(title, data);
      if (!destination) continue;
      if (resource.id.startsWith('wiki-names-')) aliases.set(title, destination);
      else requestedTeams.set(title, destination);
    }
    if (resource.id.startsWith('wiki-teams-'))
      for (const page of data.query?.pages ?? [])
        if (!page.missing && page.revisions?.[0]) pages.set(page.title, { page, resource });
  }
  if (!pages.size || !aliases.size) return { records, memberships };
  const entries = new Map<string, WikiEntry[]>();
  for (const resource of resources.values()) {
    const module = /^wiki-playerdata-([a-z0-9]+)$/.exec(resource.id)?.[1]?.toUpperCase();
    if (!module && !['wiki-coachdata', 'wiki-managerdata'].includes(resource.id)) continue;
    const content = response(resource).query?.pages?.[0]?.revisions?.[0]?.slots.main.content;
    if (!content) continue;
    for (const match of content.matchAll(/^(?:\t| {4})([A-Za-z][A-Za-z0-9_]*)\s*=\s*\{/gm)) {
      const literal = literalTable(content, match[1]!);
      const page = literal && pageName(literal);
      if (!page || !literal) continue;
      const entry = { module: module ?? '', key: match[1]!, page };
      entries.set(entry.key, [...(entries.get(entry.key) ?? []), entry]);
    }
  }
  const byPage = new Map<string, VariantSpec[]>();
  for (const variant of variants) {
    const page = aliases.get(variant.official.name);
    if (page) byPage.set(page, [...(byPage.get(page) ?? []), variant]);
  }
  const teams = new Set(
    variants.flatMap((variant) => variant.official.teams).filter((team) => !NON_TEAMS.has(team)),
  );
  const used = new Set<string>();
  for (const team of teams) {
    const titles = Object.hasOwn(TEAM_PAGES, team) ? TEAM_PAGES[team]! : [team];
    for (const title of titles) {
      const source = pages.get(requestedTeams.get(title) ?? title);
      const revision = source?.page.revisions?.[0];
      if (!source || !revision || !/\{\{Team(?:\s*[|\n])/i.test(revision.slots.main.content))
        continue;
      const debut = debutWork(revision.slots.main.content, source.page.title);
      for (const roster of rosterTemplates(revision.slots.main.content)) {
        const context = roster.context || (roster.primary === 'true' ? debut : null);
        const primaryWorks =
          roster.primary === 'true' && !roster.context
            ? (PRIMARY_ROSTER_WORKS[source.page.title] ?? []).filter(
                (work) => work === workCode(roster.game ?? ''),
              )
            : [];
        if (/rejected|non-members|manga|temporary/i.test(roster.caption ?? '')) continue;
        for (const code of new Set([...(context ? [context] : []), ...primaryWorks])) {
          if (!WORKS.some(([known]) => known === code)) continue;
          for (const [field, key] of Object.entries(roster)) {
            const number = /^[pcm](\d+)$/.exec(field)?.[1];
            if (
              !number ||
              !/^\w+$/.test(key) ||
              /manga only|rejected|not a member|cross.*only/i.test(
                roster[`playerNotes${number}`] ?? roster[`pNotes${number}`] ?? '',
              )
            )
              continue;
            for (const entry of entries.get(key) ?? []) {
              const candidates = (byPage.get(entry.page) ?? []).filter(
                (variant) =>
                  variant.official.teams.includes(team) &&
                  variant.official.appearances.includes(code),
              );
              const explicit = WIKI_MAPPINGS.filter(
                (mapping) =>
                  mapping.module === entry.module &&
                  mapping.key === key &&
                  mapping.page === entry.page,
              );
              const mapped = candidates.filter((variant) =>
                explicit.some((mapping) => mapping.id === Number(variant.externalId)),
              );
              const generic = candidates.filter(
                (variant) =>
                  !entry.module ||
                  WORKS.find(([, name]) => name === variant.official.origin)?.[0] ===
                    workCode(entry.module),
              );
              for (const match of mapped.length ? mapped : generic) {
                const externalKey = `${match.externalId}/${code}/${team}`;
                if (used.has(externalKey)) continue;
                used.add(externalKey);
                const payload = {
                  variantId: Number(match.externalId),
                  name: match.official.name,
                  page: entry.page,
                  module: entry.module,
                  playerKey: key,
                  team,
                  work: code,
                  teamPage: source.page.title,
                  revision: revision.revid,
                  roster,
                };
                const record: RecordSpec = {
                  source: 'inazuma-wiki',
                  kind: 'roster_membership',
                  key: externalKey,
                  version: `sha256:${digest(JSON.stringify(payload))}`,
                  url: `https://inazuma-eleven.fandom.com/wiki/${encodeURIComponent(source.page.title.replaceAll(' ', '_'))}`,
                  retrievedAt: source.resource.retrievedAt,
                  payload,
                  status: 'verified',
                  note: null,
                };
                records.push(record);
                memberships.push({ id: Number(match.externalId), work: code, team, record });
              }
            }
          }
        }
      }
    }
  }
  return { records, memberships };
}
