import { calculateTeamPower } from './team-power';
import type { LoadoutOptions } from '@shared/catalogue';
export { POWER_LABELS } from './power-stats';
import type {
  PlayerDetail,
  PlayerStatProfile,
  PlayerStats,
  Position,
  Element,
  Gender,
  PlayStyle,
  StatKey,
  EquipmentSlot,
} from '@shared/catalogue';
import type { Formation } from '@shared/formations';
export const RARITIES = {
  common: { name: 'Commun', color: '#b3bdd3', shadow: '#8794b140', scale: 1 },
  rising: { name: 'Émergent', color: '#34d399', shadow: '#34d39959', scale: 1.1 },
  advanced: { name: 'Avancé', color: '#38bdf8', shadow: '#38bdf859', scale: 1.2 },
  top: { name: 'Top', color: '#a78bfa', shadow: '#a78bfa5e', scale: 1.3 },
  legendary: { name: 'Légendaire', color: '#f0b800', shadow: '#d9a3006b', scale: 1.4 },
  hero: { name: 'Héro', color: '#f472b6', shadow: '#f472b657', scale: 1 },
  basara: { name: 'Basara', color: '#67e8f9', shadow: '#0d948859', scale: 1 },
} as const;
export type TeamRarity = keyof typeof RARITIES;
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
}
export interface SavedTeam {
  team: Team;
  updatedAt: string;
}
export const FIELD_SLOTS = Array.from({ length: 11 }, (_, i) => `field-${i + 1}`);
export const BENCH_SLOTS = Array.from({ length: 5 }, (_, i) => `bench-${i + 1}`);
export const STAFF_SLOTS = ['coach', 'manager-1', 'manager-2', 'manager-3'];
export const ALL_SLOTS = [...FIELD_SLOTS, ...BENCH_SLOTS, ...STAFF_SLOTS];
export const STAT_KEYS: StatKey[] = [
  'power',
  'control',
  'technique',
  'pressure',
  'physical',
  'agility',
  'intelligence',
];
export const isField = (slot: string) => FIELD_SLOTS.includes(slot);
export function emptyTeam(): Team {
  return { id: crypto.randomUUID(), name: 'Mon équipe', formation: '4-3-3-triangle', slots: {} };
}
export function clearTeam(team: Team): Team {
  return Object.keys(team.slots).length ? { ...team, slots: {} } : team;
}
export function snapshotPlayer(player: PlayerDetail): TeamPlayer {
  return {
    id: player.id,
    name: player.name,
    portraitUrl: player.portraitUrl,
    position: player.position,
    element: player.element,
    gender: player.gender,
    playStyle: player.playStyle,
    role: player.role,
    rarities: Object.keys(RARITIES).filter(
      (rarity) =>
        !['hero', 'basara'].includes(rarity) || player.rarities.some((r) => r.code === rarity),
    ) as TeamRarity[],
    profiles: player.statProfiles,
  };
}
export function slotLabel(slot: string, formation?: Formation): string {
  if (slot === 'coach') return 'Entraîneur';
  if (slot.startsWith('manager-')) return `Manager ${slot.split('-')[1]}`;
  if (slot.startsWith('bench-')) return `Banc ${slot.split('-')[1]}`;
  const position = formation?.positions.find((p) => `field-${p.slot}` === slot)?.position;
  return `${position ? { GK: 'Gardien', DF: 'Défenseur', MF: 'Milieu', FW: 'Attaquant' }[position] : 'Titulaire'} ${slot.split('-')[1]}`;
}
export function eligible(player: TeamPlayer, slot: string) {
  if (slot === 'coach') return ['Manager', 'Coach', 'Player Manager'].includes(player.role ?? '');
  if (slot.startsWith('manager-'))
    return ['Coordinator', 'Player Coordinator'].includes(player.role ?? '');
  return ['Player', 'Player Manager', 'Player Coordinator'].includes(player.role ?? '');
}
export function teamCounts(team: Team) {
  const starters = FIELD_SLOTS.flatMap((slot) => (team.slots[slot] ? [team.slots[slot]!] : []));
  return {
    starters: starters.length,
    heroes: starters.filter((a) => a.rarity === 'hero').length,
    basaras: starters.filter((a) => a.rarity === 'basara').length,
  };
}
export function ruleError(team: Team): string | null {
  const { heroes, basaras } = teamCounts(team);
  if (heroes > 2) return 'Deux joueurs Héro maximum sont autorisés sur le terrain.';
  if (basaras > 1) return 'Un seul Basara est autorisé sur le terrain.';
  return null;
}
export function putPlayer(team: Team, slot: string, assignment?: Assignment): Team {
  if (!ALL_SLOTS.includes(slot)) throw new Error('Cet emplacement est introuvable.');
  const slots = { ...team.slots };
  if (assignment) {
    if (!eligible(assignment.player, slot))
      throw new Error('Ce personnage ne peut pas occuper cet emplacement.');
    if (!assignment.player.rarities.includes(assignment.rarity))
      throw new Error('Cette rareté est indisponible pour ce joueur.');
    if (
      Object.entries(slots).some(([key, a]) => key !== slot && a.player.id === assignment.player.id)
    )
      throw new Error('Ce personnage est déjà dans l’équipe.');
    slots[slot] = assignment;
  } else delete slots[slot];
  const next = { ...team, slots };
  const error = ruleError(next);
  if (error) throw new Error(error);
  return next;
}
export function movePlayer(team: Team, from: string, to: string): Team {
  if (from === to) return team;
  if (!ALL_SLOTS.includes(from) || !ALL_SLOTS.includes(to))
    throw new Error('Cet emplacement est introuvable.');
  const source = team.slots[from];
  const target = team.slots[to];
  if (!source) return team;
  if (!eligible(source.player, to) || (target && !eligible(target.player, from)))
    throw new Error('Les joueurs et le staff ont des emplacements distincts.');
  const slots = { ...team.slots, [to]: source };
  if (target) slots[from] = target;
  else delete slots[from];
  const next = { ...team, slots };
  const error = ruleError(next);
  if (error) throw new Error(error);
  return next;
}
export function changeFormation(team: Team, next: Formation, previous?: Formation): Team {
  if (team.formation === next.code) return team;
  const slots = Object.fromEntries(Object.entries(team.slots).filter(([slot]) => !isField(slot)));
  const remaining = FIELD_SLOTS.flatMap((slot) =>
    team.slots[slot] ? [{ slot, assignment: team.slots[slot]! }] : [],
  );
  for (const position of next.positions) {
    const index = remaining.findIndex(
      (entry) =>
        previous?.positions.find((p) => `field-${p.slot}` === entry.slot)?.position ===
        position.position,
    );
    if (index >= 0) slots[`field-${position.slot}`] = remaining.splice(index, 1)[0]!.assignment;
  }
  for (const position of next.positions)
    if (!slots[`field-${position.slot}`] && remaining.length)
      slots[`field-${position.slot}`] = remaining.shift()!.assignment;
  return { ...team, formation: next.code, slots };
}
export function assignmentStats(assignment: Assignment): PlayerStats | null {
  const special = assignment.rarity === 'hero' || assignment.rarity === 'basara';
  const profile = assignment.player.profiles.find(
    (entry) => entry.rarity === (special ? assignment.rarity : 'common') && entry.level === 99,
  );
  if (!profile) return null;
  return {
    level: profile.level,
    values: Object.fromEntries(
      STAT_KEYS.map((key) => [
        key,
        profile.values[key] === null
          ? null
          : Math.round(profile.values[key]! * RARITIES[assignment.rarity].scale),
      ]),
    ) as PlayerStats['values'],
  };
}
export function baseStats(assignment: Assignment) {
  const stats = assignmentStats(assignment);
  if (!stats || STAT_KEYS.some((key) => stats.values[key] === null)) return null;
  return stats.values as Record<StatKey, number>;
}
export function teamPower(team: Team, catalogue: LoadoutOptions = { equipment: [], passives: [] }) {
  return calculateTeamPower(team, catalogue, baseStats);
}
export interface TeamHistory {
  past: Team[];
  present: Team;
  future: Team[];
}
export type TeamAction = { type: 'change'; team: Team } | { type: 'undo' | 'redo' };
export function teamReducer(state: TeamHistory, action: TeamAction): TeamHistory {
  if (action.type === 'change') {
    if (JSON.stringify(state.present) === JSON.stringify(action.team)) return state;
    return { past: [...state.past.slice(-49), state.present], present: action.team, future: [] };
  }
  if (action.type === 'undo' && state.past.length)
    return {
      past: state.past.slice(0, -1),
      present: state.past.at(-1)!,
      future: [state.present, ...state.future],
    };
  if (action.type === 'redo' && state.future.length)
    return {
      past: [...state.past, state.present],
      present: state.future[0]!,
      future: state.future.slice(1),
    };
  return state;
}
