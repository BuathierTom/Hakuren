export const WORKS = [
  ['IE', 'Inazuma Eleven'],
  ['IE2', 'Inazuma Eleven 2: Firestorm / Blizzard'],
  ['IE3', 'Inazuma Eleven 3: Lightning Bolt / Bomb Blast / Team Ogre Attacks!'],
  ['GO', 'Inazuma Eleven GO: Light / Shadow'],
  ['CS', 'Inazuma Eleven GO Chrono Stones: Wildfire / Thunderflash'],
  ['GX', 'Inazuma Eleven GO Galaxy: Big Bang / Supernova'],
  ['ARES', 'Inazuma Eleven Ares'], ['ORION', 'Inazuma Eleven Orion'],
  ['VR', 'Inazuma Eleven: Victory Road'],
] as const;
const ICONS: Record<string, string> = { ie1: 'IE', ie2: 'IE2', ie3: 'IE3', go1: 'GO', go2: 'CS', go3: 'GX', ars: 'ARES', ori: 'ORION', vic: 'VR' };

export interface OfficialPlayer {
  id: number; name: string; nickname: string; origin: string; gender: string;
  element: string; position: string; role: string; ageGroup: string; schoolYear: string;
  teams: string[]; appearances: string[];
}

export function plain(html: string): string {
  const entities: Record<string, string> = { amp: '&', quot: '"', apos: "'", nbsp: ' ', lt: '<', gt: '>', rsquo: '’', ndash: '–', mdash: '—' };
  return html.replace(/<[^>]*>/g, ' ').replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (entity: string, key: string) => {
    if (key[0] !== '#') return entities[key] ?? entity;
    const hex = key[1]?.toLowerCase() === 'x';
    const code = Number.parseInt(key.slice(hex ? 2 : 1), hex ? 16 : 10);
    if (code > 0x10ffff) throw new Error('Entité HTML invalide.');
    return String.fromCodePoint(code);
  }).replace(/\s+/g, ' ').trim();
}

export function parseOfficial(html: string): OfficialPlayer[] {
  const headers = [...html.matchAll(/<th class="appearedWorks">[\s\S]*?icn_([a-z0-9]+)\.png[\s\S]*?<\/th>/g)].map(m => ICONS[m[1]!]);
  const icons = headers.slice(0, 9);
  if (!headers.length || headers.length % 9 || headers.some((icon, i) => !icon || icon !== WORKS[i % 9]![0])) throw new Error('Colonnes du codex officiel non reconnues.');
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map(m => m[1]!);
  const players: OfficialPlayer[] = [];
  for (let i = 0; i < rows.length; i++) {
    const cells = [...rows[i]!.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1]!);
    if (!cells.some(cell => cell.includes('data-chara-id='))) continue;
    if (cells.length !== 13 || !/^\d+$/.test(plain(cells[1]!))) throw new Error('Ligne du codex non reconnue.');
    const flags = [...(rows[++i] ?? '').matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m => plain(m[1]!));
    if (flags.length !== 9 || flags.some(flag => flag !== '○' && flag !== '×')) throw new Error('Apparitions du codex non reconnues.');
    players.push({
      id: Number(plain(cells[1]!)), name: plain(cells[2]!), nickname: plain(cells[3]!),
      origin: plain(cells[4]!), gender: plain(cells[5]!), element: plain(cells[6]!), position: plain(cells[7]!),
      role: plain(cells[8]!), ageGroup: plain(cells[9]!), schoolYear: plain(cells[10]!),
      teams: cells[11]!.split(/<br\s*\/?>/i).map(plain).filter(Boolean),
      appearances: icons.filter((icon, index): icon is string => !!icon && flags[index] === '○'),
    });
  }
  if (!players.length) throw new Error('Aucun joueur extrait du codex.');
  return players;
}

export function lastPage(html: string): number {
  const page = Math.max(1, ...[...html.matchAll(/[?&](?:amp;)?page=(\d+)/g)].map(m => Number(m[1])));
  if (page > 100) throw new Error('Pagination du codex inattendue.');
  return page;
}
