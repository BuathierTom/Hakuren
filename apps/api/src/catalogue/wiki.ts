import { plain } from './official.js';

// Reads only literal tables from public modules. Downloaded Lua is never executed.
export function literalTable(source: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?:^|\\n)[ \\t]*${escaped}\\s*=\\s*\\{`).exec(source);
  if (!match) return null;
  const start = source.indexOf('{', match.index);
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (char === '"' || char === "'") {
      const quote = char;
      for (i++; i < source.length; i++) {
        if (source[i] === '\\') i++;
        else if (source[i] === quote) break;
      }
    } else if (source.startsWith('--', i)) {
      const block = source.slice(i + 2).match(/^\[(=*)\[/);
      const end = block ? source.indexOf(`]${block[1]}]`, i + block[0].length + 2) : source.indexOf('\n', i);
      if (end < 0) throw new Error(`Commentaire Lua incomplet : ${key}`);
      i = block ? end + block[1]!.length + 1 : end;
    } else if (char === '[' && /^\[=*\[/.test(source.slice(i))) {
      const block = source.slice(i).match(/^\[(=*)\[/)!;
      const end = source.indexOf(`]${block[1]}]`, i + block[0].length);
      if (end < 0) throw new Error(`Chaîne Lua incomplète : ${key}`);
      i = end + block[1]!.length + 1;
    } else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Table Lua incomplète : ${key}`);
}

export function wikiContent(body: string): string {
  const data = JSON.parse(body);
  const content: unknown = data?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content;
  if (typeof content !== 'string' || !content.length) throw new Error('Module wiki vide ou invalide.');
  return content;
}

export function pageName(entry: string): string | null {
  return entry.match(/(?:^|\n)\s*page\s*=\s*"([^"\n]+)"/)?.[1] ?? null;
}

export interface WikiMove { key: string; level: number | null; alternatePath: boolean; flags: Record<string, unknown> }
export function parseMoves(table: string): WikiMove[] {
  const withoutComments = table.replace(/--[^\n]*/g, '');
  const rows = [...withoutComments.matchAll(/\{\s*["']([^"'\n]+)["']\s*,\s*(\d+|"[^"\n]*"|'[^'\n]*')([^{}]*)\}/g)];
  const remainder = withoutComments.slice(1, -1).replace(/\{\s*["']([^"'\n]+)["']\s*,\s*(\d+|"[^"\n]*"|'[^'\n]*')([^{}]*)\}/g, '').replace(/[\s,]/g, '');
  if (remainder) throw new Error('Expression de moveset non prise en charge : correspondance laissée en attente.');
  return rows.map(row => {
    const flags: Record<string, unknown> = {};
    const modifiers = row[3]!.replace(/^\s*,\s*["']([^"'\n]*)["']/, (_match, evolution: string) => {
      flags.evolution = evolution;
      return '';
    });
    const rest = modifiers.replace(/,\s*([A-Za-z]+)\s*=\s*(true|false|-?\d+)/g, (_match, key: string, value: string) => {
      flags[key] = value === 'true' ? true : value === 'false' ? false : Number(value);
      return '';
    });
    if (rest.replace(/[\s,\d.]/g, '')) throw new Error('Drapeau de moveset non pris en charge.');
    const numeric = /^\d+$/.test(row[2]!);
    if (!numeric) flags.sourceLevel = plain(row[2]!.slice(1, -1));
    return { key: row[1]!, level: numeric && Number(row[2]) > 0 ? Number(row[2]) : null, alternatePath: flags.a === true, flags };
  });
}
