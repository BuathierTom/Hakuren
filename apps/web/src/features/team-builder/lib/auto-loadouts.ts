import type { CatalogueItem, LoadoutOptions, Passive, Position } from '@shared/catalogue';
import type { Formation } from '@shared/formations';
import { EQUIPMENT_ORDER, groupedPassives, passiveSource, setPassive } from './loadouts';
import { passiveEffect } from './passive-effects';
import { computePower, POWER_KEYS, type BaseStats, type PowerStats } from './power-stats';
import { calculateTeamPower, createPowerCalculator } from './team-power';
import { ALL_SLOTS, baseStats, type Assignment, type Team } from './team';

const priorities: Record<Position, Partial<PowerStats>> = {
  GK: { kp: 1 },
  DF: { wallDF: 0.5, focusDF: 0.3, scrambleDF: 0.2 },
  MF: { focusAT: 0.3, focusDF: 0.3, scrambleAT: 0.2, scrambleDF: 0.2 },
  FW: { shootAT: 0.6, focusAT: 0.25, scrambleAT: 0.15 },
};
const neutralStats: BaseStats = {
  power: 100,
  control: 100,
  technique: 100,
  pressure: 100,
  physical: 100,
  agility: 100,
  intelligence: 100,
};
const scoringStats = (assignment: Assignment) => baseStats(assignment) ?? neutralStats;
function positionFor(team: Team, formation: Formation, slot: string) {
  return (
    formation.positions.find((position) => `field-${position.slot}` === slot)?.position ??
    team.slots[slot]?.player.position ??
    null
  );
}
function roleScore(power: PowerStats, baseline: PowerStats, position: Position | null) {
  return POWER_KEYS.reduce(
    (score, key) =>
      score +
      (power[key] / Math.max(1, baseline[key])) *
        (position ? (priorities[position][key] ?? 0) : 1 / POWER_KEYS.length),
    0,
  );
}
function equipmentScore(item: CatalogueItem, assignment: Assignment, position: Position | null) {
  const base = scoringStats(assignment);
  const equipped = { ...base };
  for (const key of Object.keys(base) as (keyof BaseStats)[]) equipped[key] += item.stats[key] ?? 0;
  return roleScore(computePower(equipped), computePower(base), position);
}
const familyKey = (passive: Passive) =>
  passive.family == null ? `id:${passive.id}` : `family:${passive.family}`;
function fallbackPriority(passive: Passive, assignment: Assignment) {
  const kind = passiveEffect(passive.name)?.kind;
  return (
    (kind === 'gauge' ? 4 : kind === 'match-state' ? 2 : kind ? 1 : 0) +
    Number(
      !!passive.playStyle &&
        passive.playStyle === (assignment.playStyle ?? assignment.player.playStyle),
    )
  );
}
function evaluationTeam(team: Team, formation: Formation, slot: string) {
  if (!slot.startsWith('bench-')) return { team, slot };
  const position = positionFor(team, formation, slot);
  const target =
    formation.positions.find((entry) => entry.position === position) ?? formation.positions[0];
  const field = `field-${target?.slot ?? 1}`;
  return { team: { ...team, slots: { ...team.slots, [field]: team.slots[slot]! } }, slot: field };
}
function powerObjective(
  team: Team,
  formation: Formation,
  source: string,
  catalogue: LoadoutOptions,
) {
  const baseline = calculateTeamPower(team, { ...catalogue, passives: [] }, scoringStats).bySlot;
  const calculate = createPowerCalculator(catalogue, scoringStats);
  const measure = (current: Team) => {
    const { bySlot } = calculate(current);
    let total = 0,
      local = 0,
      count = 0;
    for (const [slot, powers] of Object.entries(bySlot)) {
      const normalizer = baseline[slot]!.totals;
      const position = positionFor(current, formation, slot);
      const score =
        roleScore(powers.totals, normalizer, position) * 0.65 +
        roleScore(powers.potential, normalizer, position) * 0.35;
      total += score;
      count++;
      if (slot === source) local = score;
    }
    const average = count ? total / count : 0;
    return source.startsWith('field-') ? local * 0.7 + average * 0.3 : average;
  };
  return measure;
}
export function fillTeamLoadouts(
  team: Team,
  formation: Formation,
  catalogue: LoadoutOptions,
): Team {
  const next: Team = { ...team, slots: { ...team.slots } };
  const passives = new Map(catalogue.passives.map((passive) => [passive.id, passive]));
  for (const slot of ALL_SLOTS) {
    const assignment = next.slots[slot];
    if (!assignment) continue;
    const equipment = { ...assignment.equipment };
    for (const type of EQUIPMENT_ORDER) {
      if (equipment[type]) continue;
      const candidates = catalogue.equipment.filter(
        (item) => item.section === 'equipment' && item.slot === type,
      );
      const position = positionFor(next, formation, slot);
      candidates.sort(
        (a, b) =>
          equipmentScore(b, assignment, position) - equipmentScore(a, assignment, position) ||
          a.id - b.id,
      );
      if (candidates[0]) equipment[type] = candidates[0].id;
    }
    if (Object.keys(equipment).length) next.slots[slot] = { ...assignment, equipment };
  }
  for (const slot of ALL_SLOTS) {
    let assignment = next.slots[slot];
    if (!assignment) continue;
    const used = new Set(
      (assignment.passives ?? []).flatMap((selected) => {
        const passive = selected ? passives.get(selected.id) : null;
        return passive ? [familyKey(passive)] : [];
      }),
    );
    const style = assignment.playStyle ?? assignment.player.playStyle;
    const sources = new Map<string, Passive[]>();
    const context = evaluationTeam(next, formation, slot);
    let working = context.team;
    const measure = powerObjective(working, formation, context.slot, catalogue);
    for (let index = 0; index < 6; index++) {
      if (assignment.passives?.[index]) continue;
      const source = passiveSource(slot, index);
      if (!sources.has(source))
        sources.set(
          source,
          groupedPassives(catalogue.passives, source, assignment.rarity)
            .filter(
              (passive) =>
                (!passive.playStyle || passive.playStyle === style) &&
                Number.isFinite(passive.value) &&
                passive.value > 0 &&
                passive.value <= 99999,
            )
            .sort((a, b) => a.id - b.id),
        );
      const currentScore = measure(working);
      let best: Passive | null = null,
        bestScore = -Infinity;
      for (const passive of sources.get(source)!) {
        if (used.has(familyKey(passive))) continue;
        const candidate = setPassive(assignment, index, passive);
        const trial = { ...working, slots: { ...working.slots, [context.slot]: candidate } };
        const score = measure(trial) - currentScore;
        if (
          score > bestScore + 1e-9 ||
          (Math.abs(score - bestScore) <= 1e-9 &&
            best &&
            fallbackPriority(passive, assignment) > fallbackPriority(best, assignment))
        ) {
          best = passive;
          bestScore = score;
        }
      }
      if (best) {
        assignment = setPassive(assignment, index, best);
        used.add(familyKey(best));
        working = { ...working, slots: { ...working.slots, [context.slot]: assignment } };
      }
    }
    next.slots[slot] = assignment;
  }
  return JSON.stringify(next) === JSON.stringify(team) ? team : next;
}
