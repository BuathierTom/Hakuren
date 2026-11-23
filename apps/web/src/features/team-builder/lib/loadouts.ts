import type { Passive, PassiveSource, CatalogueItem, EquipmentSlot } from '@shared/catalogue';
import type { Assignment, TeamRarity } from './team';
export const EQUIPMENT_ORDER: EquipmentSlot[] = ['boots', 'pendant', 'bracelet', 'accessory'];
export function passiveSource(slot: string, index: number): PassiveSource {
  if (slot === 'coach') return 'coach';
  if (slot.startsWith('manager-')) return 'manager';
  return index === 5 ? 'custom' : 'player';
}
export function groupedPassives(passives: Passive[], source: PassiveSource, rarity: TeamRarity) {
  const tier = { common: 0, rising: 1, advanced: 2, top: 3, legendary: 4, hero: 4, basara: 4 }[
    rarity
  ];
  const families = new Map<string, Passive[]>();
  for (const passive of passives.filter((passive) => passive.source === source)) {
    const key = passive.family == null ? `id:${passive.id}` : `family:${passive.family}`;
    families.set(key, [...(families.get(key) ?? []), passive]);
  }
  return [...families.values()]
    .map(
      (siblings) =>
        siblings.find((p) => p.tier === tier) ??
        siblings
          .filter((p) => (p.tier ?? 0) <= tier)
          .sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0))[0] ??
        siblings[0]!,
    )
    .sort((a, b) => a.description.localeCompare(b.description, 'fr'));
}
export function setPassive(
  assignment: Assignment,
  index: number,
  passive: Passive | null,
): Assignment {
  const passives = Array.from({ length: 6 }, (_, i) => assignment.passives?.[i] ?? null);
  passives[index] = passive ? { id: passive.id, value: passive.value } : null;
  return { ...assignment, passives };
}
export function fillEquipment(assignment: Assignment, items: CatalogueItem[]): Assignment {
  const equipment = { ...assignment.equipment };
  for (const slot of EQUIPMENT_ORDER) {
    if (equipment[slot]) continue;
    const sorted = items
      .filter((item) => item.slot === slot)
      .sort(
        (a, b) =>
          Object.values(b.stats).reduce((s, v) => s + (v ?? 0), 0) -
            Object.values(a.stats).reduce((s, v) => s + (v ?? 0), 0) || a.id - b.id,
      );
    if (sorted[0]) equipment[slot] = sorted[0].id;
  }
  return { ...assignment, equipment };
}
export function fillPassives(
  assignment: Assignment,
  slot: string,
  catalogue: Passive[],
): Assignment {
  let next = assignment;
  const used = new Set((assignment.passives ?? []).flatMap((p) => (p ? [p.id] : [])));
  const style = assignment.playStyle ?? assignment.player.playStyle;
  for (let index = 0; index < 6; index++) {
    if (next.passives?.[index]) continue;
    const candidates = groupedPassives(catalogue, passiveSource(slot, index), assignment.rarity)
      .filter((p) => !used.has(p.id) && (!p.playStyle || p.playStyle === style))
      .sort(
        (a, b) =>
          Number(b.playStyle === style) - Number(a.playStyle === style) ||
          b.value - a.value ||
          a.id - b.id,
      );
    if (candidates[0]) {
      next = setPassive(next, index, candidates[0]);
      used.add(candidates[0].id);
    }
  }
  return next;
}
