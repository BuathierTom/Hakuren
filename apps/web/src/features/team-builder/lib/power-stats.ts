import type { StatKey } from '@shared/catalogue';
export const POWER_LABELS = {
  shootAT: 'Shoot AT',
  focusAT: 'Focus AT',
  focusDF: 'Focus DF',
  wallDF: 'Wall DF',
  scrambleAT: 'Scramble AT',
  scrambleDF: 'Scramble DF',
  kp: 'KP',
};
export type PowerKey = keyof typeof POWER_LABELS;
export type PowerStats = Record<PowerKey, number>;
export const POWER_KEYS = Object.keys(POWER_LABELS) as PowerKey[];
export type BaseStats = Record<StatKey, number>;
export function emptyPower(): PowerStats {
  return { shootAT: 0, focusAT: 0, focusDF: 0, wallDF: 0, scrambleAT: 0, scrambleDF: 0, kp: 0 };
}
export function computePower(s: BaseStats): PowerStats {
  return {
    shootAT: Math.round(s.power + s.control),
    focusAT: Math.round(s.technique + s.control + s.power * 0.5),
    focusDF: Math.round(s.technique + s.intelligence + s.agility * 0.5),
    wallDF: Math.round(s.pressure + s.physical),
    scrambleAT: Math.round(s.intelligence + s.physical),
    scrambleDF: Math.round(s.intelligence + s.pressure),
    kp: Math.round(s.pressure * 2 + s.physical * 3 + s.agility * 4),
  };
}
