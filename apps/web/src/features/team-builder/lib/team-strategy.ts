import { t } from '../../preferences/lib/i18n';
import type { Team } from './team';

export function setTeamTactic(team: Team, index: number, id: number | null): Team {
  if (!Number.isInteger(index) || index < 0 || index > 2)
    throw new Error(t('Trois tactiques maximum sont autorisées.'));
  if (id !== null && (!Number.isSafeInteger(id) || id <= 0 || id > 4294967295))
    throw new Error(t('Cette tactique est invalide.'));
  const tactics = Array.from({ length: 3 }, (_, slot) => team.tactics?.[slot] ?? null);
  if (id !== null && tactics.some((current, slot) => slot !== index && current === id))
    throw new Error(t('Cette tactique est déjà sélectionnée.'));
  tactics[index] = id;
  return { ...team, tactics };
}
