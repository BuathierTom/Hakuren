import type { LoadoutOptions } from '@shared/catalogue';
import type { Assignment, Team } from './team';
import { computePower, emptyPower, POWER_KEYS, type BaseStats, type PowerKey } from './power-stats';
import { passiveEffect, type PassiveEffect, type PowerEffect } from './passive-effects';
interface Source {
  slot: string;
  assignment: Assignment;
}
interface Target extends Source {
  stats: BaseStats;
  bonuses: Record<PowerKey, { value: number; effect: PowerEffect }[]>;
}
const onPitch = (slot: string) => /^field-(?:[1-9]|1[01])$/.test(slot);
function targetsFor(
  effect: Exclude<PassiveEffect, { kind: 'gauge' } | { kind: 'match-state' }>,
  source: Source,
  starters: Target[],
) {
  const player = source.assignment.player;
  return starters.filter((target) => {
    const candidate = target.assignment.player;
    switch (effect.scope) {
      case 'self':
        return source.slot === target.slot;
      case 'team':
        return true;
      case 'same-element':
        return player.element !== null && candidate.element === player.element;
      case 'different-element':
        return (
          player.element !== null &&
          candidate.element !== null &&
          candidate.element !== player.element
        );
      case 'same-position':
        return player.position !== null && candidate.position === player.position;
      case 'different-position':
        return (
          player.position !== null &&
          candidate.position !== null &&
          candidate.position !== player.position
        );
      case 'nearby':
        return true;
      default:
        return candidate.position === effect.scope;
    }
  });
}
function percent(bonuses: Target['bonuses'][PowerKey], conditional: boolean) {
  const capped = new Map<string, { value: number; max: number; phase?: PowerEffect['phase'] }>();
  const phases = new Map<string, number>();
  let value = 0;
  const add = (percent: number, phase?: PowerEffect['phase']) => {
    if (phase) phases.set(phase, (phases.get(phase) ?? 0) + percent);
    else value += percent;
  };
  for (const bonus of bonuses) {
    if (bonus.effect.conditional && !conditional) continue;
    const cap = bonus.effect.cap;
    if (cap) {
      const current = capped.get(cap.key);
      capped.set(cap.key, {
        value: (current?.value ?? 0) + bonus.value,
        max: cap.max,
        phase: bonus.effect.phase,
      });
    } else add(bonus.value, bonus.effect.phase);
  }
  for (const group of capped.values()) add(Math.min(group.value, group.max), group.phase);
  return (
    value +
    Math.max(phases.get('own-half') ?? 0, phases.get('opponent-half') ?? 0) +
    Math.max(phases.get('first-half') ?? 0, phases.get('second-half') ?? 0)
  );
}
export function calculateTeamPower(
  team: Team,
  catalogue: LoadoutOptions,
  statsFor: (assignment: Assignment) => BaseStats | null,
) {
  const totals = emptyPower();
  const potential = emptyPower();
  let missing = 0;
  const sources = Object.entries(team.slots)
    .filter(([slot]) => onPitch(slot) || slot === 'coach' || /^manager-[1-3]$/.test(slot))
    .map(([slot, assignment]) => ({ slot, assignment }));
  const equipment = new Map(catalogue.equipment.map((item) => [item.id, item]));
  const passives = new Map(catalogue.passives.map((passive) => [passive.id, passive]));
  const starters: Target[] = [];
  const unavailable = new Set<string>();
  const unresolved = new Set<string>();
  const matchState = new Set<string>();
  const gauges = new Set<string>();
  for (const source of sources.filter((source) => onPitch(source.slot))) {
    const base = statsFor(source.assignment);
    if (!base) {
      missing++;
      continue;
    }
    const stats = { ...base };
    for (const [slot, id] of Object.entries(source.assignment.equipment ?? {})) {
      if (!id) continue;
      const item = equipment.get(id);
      if (!item || item.section !== 'equipment' || item.slot !== slot) {
        unavailable.add(`equipment:${source.slot}:${slot}`);
        continue;
      }
      for (const [key, value] of Object.entries(item.stats))
        if (Object.hasOwn(stats, key) && typeof value === 'number' && Number.isFinite(value))
          stats[key as keyof BaseStats] += value;
    }
    starters.push({
      ...source,
      stats,
      bonuses: {
        shootAT: [],
        focusAT: [],
        focusDF: [],
        wallDF: [],
        scrambleAT: [],
        scrambleDF: [],
        kp: [],
      },
    });
  }
  for (const source of sources)
    for (const [index, selected] of (source.assignment.passives ?? []).entries()) {
      if (
        !selected ||
        !Number.isFinite(selected.value) ||
        selected.value <= 0 ||
        selected.value > 99999
      )
        continue;
      const identity = `${source.slot}:${index}`;
      const passive = passives.get(selected.id);
      if (!passive) {
        unavailable.add(`passive:${identity}`);
        continue;
      }
      const effect = passiveEffect(passive.name);
      if (!effect) {
        unresolved.add(identity);
        continue;
      }
      if (effect.kind === 'gauge') {
        gauges.add(identity);
        continue;
      }
      if (effect.kind === 'match-state') {
        matchState.add(identity);
        continue;
      }
      if (
        effect.kind === 'power' &&
        effect.neighbor &&
        !sources.some(
          (target) =>
            onPitch(target.slot) &&
            target.slot !== source.slot &&
            source.assignment.player.element !== null &&
            target.assignment.player.element !== null &&
            (effect.neighbor === 'same-element'
              ? target.assignment.player.element === source.assignment.player.element
              : target.assignment.player.element !== source.assignment.player.element),
        )
      )
        continue;
      for (const target of targetsFor(effect, source, starters)) {
        if (effect.kind === 'flat') target.stats[effect.stat] += selected.value;
        else
          for (const key of effect.keys)
            target.bonuses[key].push({ value: selected.value, effect });
      }
    }
  for (const target of starters) {
    for (const key of Object.keys(target.stats) as (keyof BaseStats)[])
      target.stats[key] = Math.max(0, target.stats[key]);
    const base = computePower(target.stats);
    for (const key of POWER_KEYS) {
      totals[key] += Math.max(
        0,
        Math.round(base[key] * (1 + percent(target.bonuses[key], false) / 100)),
      );
      potential[key] += Math.max(
        0,
        Math.round(base[key] * (1 + percent(target.bonuses[key], true) / 100)),
      );
    }
  }
  return {
    totals,
    potential,
    missing,
    unavailable: unavailable.size,
    unresolved: unresolved.size,
    matchState: matchState.size,
    gauges: gauges.size,
  };
}
