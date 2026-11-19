import type { Position } from '@shared/catalogue';
import type { Formation } from '@shared/formations';
import { FIELD_SLOTS, baseStats, type Team } from './team';
const positions: Record<Position, string> = { GK: 'GAR', DF: 'DÉF', MF: 'MIL', FW: 'ATT' };
export interface TeamAlert {
  code: 'off-position' | 'missing-stats' | 'hero-limit' | 'basara-limit';
  message: string;
  slots: string[];
  details?: Record<string, string>;
}
export function teamAlerts(team: Team, formation: Formation): TeamAlert[] {
  const alerts: TeamAlert[] = [];
  const misplaced: { slot: string; message: string }[] = [];
  const missing: string[] = [];
  const heroes: string[] = [];
  const basaras: string[] = [];
  for (const slot of FIELD_SLOTS) {
    const assignment = team.slots[slot];
    if (!assignment) continue;
    const expected = formation.positions.find(
      (position) => `field-${position.slot}` === slot,
    )?.position;
    const actual = assignment.player.position;
    if (actual && expected && actual !== expected)
      misplaced.push({
        slot,
        message: `${assignment.player.name} (${positions[actual]} → ${positions[expected]})`,
      });
    if (!baseStats(assignment)) missing.push(slot);
    if (assignment.rarity === 'hero') heroes.push(slot);
    if (assignment.rarity === 'basara') basaras.push(slot);
  }
  if (misplaced.length)
    alerts.push({
      code: 'off-position',
      message: `${misplaced.length} joueur${misplaced.length > 1 ? 's' : ''} hors poste : ${misplaced.map((entry) => entry.message).join(' ; ')}`,
      slots: misplaced.map((entry) => entry.slot),
      details: Object.fromEntries(
        misplaced.map((entry) => [entry.slot, `Hors poste : ${entry.message}`]),
      ),
    });
  if (heroes.length > 2)
    alerts.push({
      code: 'hero-limit',
      message: 'Deux HERO maximum sont autorisés sur le terrain.',
      slots: heroes,
    });
  if (basaras.length > 1)
    alerts.push({
      code: 'basara-limit',
      message: 'Un seul BASARA est autorisé sur le terrain.',
      slots: basaras,
    });
  if (missing.length)
    alerts.push({
      code: 'missing-stats',
      message: `${missing.length} joueur${missing.length > 1 ? 's' : ''} sans statistiques complètes : ${missing.map((slot) => team.slots[slot]!.player.name).join(', ')}`,
      slots: missing,
      details: Object.fromEntries(
        missing.map((slot) => [
          slot,
          `Statistiques de base incomplètes pour ${team.slots[slot]!.player.name}.`,
        ]),
      ),
    });
  return alerts;
}
export function playerWarning(alerts: TeamAlert[], slot: string): string | null {
  const messages = alerts
    .filter((alert) => alert.slots.includes(slot))
    .map((alert) => alert.details?.[slot] ?? alert.message);
  return messages.length ? messages.join(' - ') : null;
}
