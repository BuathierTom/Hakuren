import { t } from '../../preferences/lib/i18n';
import type { Team } from './team';

export const PLAYER_NOTE_LIMIT = 10_000;
const TEAM_NOTES_LIMIT = 100_000;
const TEAM_NOTE_CAPACITY = 500;

export function validPlayerNotes(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return (
    entries.length <= TEAM_NOTE_CAPACITY &&
    entries.every(
      ([id, note]) =>
        /^[1-9]\d{0,9}$/.test(id) &&
        Number(id) <= 4294967295 &&
        typeof note === 'string' &&
        note.length <= PLAYER_NOTE_LIMIT,
    ) &&
    entries.reduce((total, [, note]) => total + (note as string).length, 0) <= TEAM_NOTES_LIMIT
  );
}

export function playerNote(team: Team, playerId: number): string {
  return team.playerNotes?.[String(playerId)] ?? '';
}

export function setPlayerNote(team: Team, playerId: number, note: string): Team {
  if (!Object.values(team.slots).some((assignment) => assignment.player.id === playerId))
    throw new Error(t('Ce joueur ne fait pas partie de cette équipe.'));
  if (typeof note !== 'string' || note.length > PLAYER_NOTE_LIMIT)
    throw new Error(t('La note ne peut pas dépasser 10 000 caractères.'));
  if (playerNote(team, playerId) === note) return team;
  const playerNotes = { ...team.playerNotes };
  if (note === '') delete playerNotes[String(playerId)];
  else playerNotes[String(playerId)] = note;
  if (!validPlayerNotes(playerNotes))
    throw new Error(
      t('La limite de notes de cette équipe est atteinte. Raccourcis ou efface une note.'),
    );
  const next: Team = { ...team, playerNotes };
  if (!Object.keys(playerNotes).length) delete next.playerNotes;
  return next;
}
