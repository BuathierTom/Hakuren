import type {
  PlayerStatProfile,
  Position,
  Element,
  Gender,
  PlayStyle,
  EquipmentSlot,
} from './catalogue.js';
export type TeamRarity = 'common' | 'rising' | 'advanced' | 'top' | 'legendary' | 'hero' | 'basara';
export interface TeamPlayer {
  id: number;
  name: string;
  portraitUrl: string | null;
  position: Position | null;
  element: Element | null;
  gender: Gender | null;
  playStyle: PlayStyle | null;
  role: string | null;
  rarities: TeamRarity[];
  profiles: PlayerStatProfile[];
}
export interface PassiveAssignment {
  id: number;
  value: number;
}
export interface Assignment {
  equipment?: Partial<Record<EquipmentSlot, number | null>>;
  passives?: (PassiveAssignment | null)[];
  playStyle?: PlayStyle;
  player: TeamPlayer;
  rarity: TeamRarity;
}
export interface Team {
  id: string;
  name: string;
  formation: string;
  slots: Record<string, Assignment>;
  playStyle?: PlayStyle | null;
  tactics?: (number | null)[];
  playerNotes?: Record<string, string>;
}
export interface SavedTeam {
  team: Team;
  updatedAt: string;
  revision?: number;
}
export interface AccountTeam extends SavedTeam {
  revision: number;
}
