export type CatalogueLanguage = 'fr' | 'en';
export type CatalogueTranslations = Partial<
  Record<CatalogueLanguage, { name: string | null; description: string | null }>
>;
export interface LocalizedCatalogueEntry {
  translations?: CatalogueTranslations;
}
export type Element = 'wind' | 'forest' | 'fire' | 'mountain' | 'void';
export type Gender = 'male' | 'female' | 'neutral';
export type PlayStyle = 'breach' | 'tension' | 'counter' | 'bond' | 'rough_play' | 'justice';
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
  | 'bond_transform'
  | 'awakening_power'
  | 'mode_change'
  | 'awakening_change'
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
  counts: {
    players: number;
    techniques: number;
    appearances: number;
    equipment?: number;
    tactics?: number;
    passives?: number;
    teams?: number;
  };
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
export interface PlayerQuery {
  gender?: Gender;
  style?: PlayStyle;
  q?: string;
  work?: string;
  position?: Position;
  element?: Element;
  rarity?: string;
  role?: 'player' | 'staff' | 'manager' | 'coordinator';
  eligibility?: 'player' | 'coach' | 'manager';
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
export interface PlayerSummary extends LocalizedCatalogueEntry {
  gender: Gender | null;
  playStyle: PlayStyle | null;
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
  teams: string[];
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
export type PlayerForm = 'common' | 'hero' | 'basara';
export interface PlayerStatProfile extends PlayerStats {
  rarity: PlayerForm;
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
  description: string | null;
  statProfiles: PlayerStatProfile[];
  schoolYear: string | null;
  aliases: string[];
  recordedTeams: string[];
  history: { work: Work; teams: string[] }[];
  statistics: PlayerStats | null;
  learnsets: PlayerLearnset[];
  variants: PlayerSummary[];
  sourceUrl: string | null;
}
export interface TechniqueSummary extends LocalizedCatalogueEntry {
  id: number;
  name: string;
  category: Category | null;
  element: Element | null;
  gameId?: string | null;
  kind?: 'hissatsu' | 'aura_hissatsu' | 'aura' | null;
  power?: number | null;
  tension?: number | null;
  notes?: string[];
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
  description?: string | null;
  grantedTechnique?: TechniqueSummary | null;
  grantedBy?: TechniqueSummary[];
  aliases: string[];
  profiles: TechniqueProfile[];
  users: PlayerSummary[];
  userCount: number;
  preview: { url: string; mimeType: string | null } | null;
  sourceUrl: string | null;
}

export type ItemSection = 'equipment' | 'tactics';
export type EquipmentSlot = 'boots' | 'bracelet' | 'pendant' | 'accessory';
export interface ItemQuery {
  q?: string;
  slot?: EquipmentSlot;
  page?: number;
  limit?: number;
}
export interface CatalogueItem extends LocalizedCatalogueEntry {
  id: number;
  section: ItemSection;
  gameId: string;
  stringId: string;
  name: string;
  description: string | null;
  slot: EquipmentSlot | null;
  imageUrl: string | null;
  tension: number | null;
  stats: Partial<Record<StatKey, number>>;
  sourceUrl: string | null;
}

export type PassiveSource = 'player' | 'custom' | 'coach' | 'manager';
export interface PassiveQuery {
  q?: string;
  source?: PassiveSource;
  style?: PlayStyle;
  page?: number;
  limit?: number;
}
export interface Passive extends LocalizedCatalogueEntry {
  id: number;
  gameId: string;
  stringId: string;
  name: string;
  description: string;
  source: PassiveSource;
  playStyle: PlayStyle | null;
  value: number;
  unit: 'percent' | 'points';
  icon: number | null;
  family: number | null;
  tier: number | null;
  sourceUrl: string | null;
}
export interface HistoricalTeamQuery {
  q?: string;
  work?: string;
  page?: number;
  limit?: number;
}
export interface HistoricalTeam extends LocalizedCatalogueEntry {
  id: number;
  name: string;
  logoUrl: string | null;
  sourceUrl: string | null;
  playerCount: number;
  works: Work[];
}
export interface HistoricalTeamDetail extends HistoricalTeam {
  rosters: { work: Work | null; players: PlayerSummary[] }[];
}
export interface LoadoutOptions {
  equipment: CatalogueItem[];
  passives: Passive[];
}
