export type Element = 'wind' | 'forest' | 'fire' | 'mountain' | 'void';
export type Position = 'GK' | 'DF' | 'MF' | 'FW';
export type Category =
  | 'shoot'
  | 'dribble'
  | 'block'
  | 'catch'
  | 'keshin'
  | 'keshin_armed'
  | 'miximax'
  | 'totem'
  | 'tactic'
  | 'passive'
  | 'other';
export interface Work {
  id: number;
  code: string;
  name: string;
  kind: 'game' | 'anime';
}
export interface Rarity {
  code: string;
  name: string;
}
export interface CatalogueFilters {
  works: (Work & { playerCount: number })[];
  rarities: Rarity[];
  counts: { players: number; techniques: number; appearances: number };
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
export interface PlayerQuery {
  q?: string;
  work?: string;
  position?: Position;
  element?: Element;
  rarity?: string;
  role?: 'player' | 'staff';
  technique?: number;
  sort?: 'number' | 'name';
  page?: number;
  limit?: number;
}
export interface TechniqueQuery {
  q?: string;
  work?: string;
  element?: Element;
  category?: Category | 'unknown';
  page?: number;
  limit?: number;
}
export interface PlayerSummary {
  id: number;
  number: string | null;
  name: string;
  variantLabel: string | null;
  formLabel: string | null;
  portraitUrl: string | null;
  element: Element | null;
  position: Position | null;
  role: string | null;
  ageGroup: string | null;
  origin: Work | null;
  appearances: Work[];
  rarities: Rarity[];
}
export type StatKey =
  'power' | 'control' | 'technique' | 'pressure' | 'physical' | 'agility' | 'intelligence';
export interface PlayerStats {
  level: number | null;
  values: Record<StatKey, number | null>;
}
export interface PlayerLearnset {
  id: number;
  technique: TechniqueSummary;
  work: Work;
  mode: string;
  version: string;
  formLabel: string | null;
  level: number | null;
  evolution: string | null;
  alternatePath: boolean | null;
  basaraOnly: boolean | null;
  rarityScope: 'unknown' | 'unrestricted' | 'restricted';
  rarities: Rarity[];
}
export interface PlayerDetail extends PlayerSummary {
  gender: string | null;
  schoolYear: string | null;
  aliases: string[];
  recordedTeams: string[];
  history: { work: Work; teams: string[] }[];
  statistics: PlayerStats | null;
  learnsets: PlayerLearnset[];
  variants: PlayerSummary[];
  sourceUrl: string | null;
}
export interface TechniqueSummary {
  id: number;
  name: string;
  category: Category | null;
  element: Element | null;
}
export interface TechniqueProfile {
  id: number;
  work: Work;
  key: string;
  rarity: Rarity | null;
  power: number | null;
  cost: number | null;
  element: Element | null;
  parameters: Record<string, unknown> | null;
}
export interface TechniqueDetail extends TechniqueSummary {
  aliases: string[];
  profiles: TechniqueProfile[];
  users: PlayerSummary[];
  userCount: number;
  preview: { url: string; mimeType: string | null } | null;
  sourceUrl: string | null;
}
