import {
  ALL_SLOTS,
  RARITIES,
  STAT_KEYS,
  eligible,
  type Team,
  type SavedTeam,
  type Assignment,
} from './team';
const playStyles = ['breach', 'tension', 'counter', 'bond', 'rough_play', 'justice'];
const DRAFT_KEY = 'hakuren.team-draft.v1';
export const TEAMS_KEY = 'hakuren.teams.v1';
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max;
const optional = (value: unknown, options: string[]) =>
  value === null || (typeof value === 'string' && options.includes(value));
export function decodeTeam(value: unknown): Team | null {
  if (
    !record(value) ||
    !text(value.id, 80) ||
    !value.id ||
    !text(value.name, 120) ||
    !text(value.formation, 32) ||
    !record(value.slots)
  )
    return null;
  const ids = new Set<number>();
  for (const [slot, assignment] of Object.entries(value.slots)) {
    if (
      !ALL_SLOTS.includes(slot) ||
      !record(assignment) ||
      !record(assignment.player) ||
      typeof assignment.rarity !== 'string' ||
      !Object.hasOwn(RARITIES, assignment.rarity) ||
      (assignment.playStyle !== undefined &&
        !(typeof assignment.playStyle === 'string' && playStyles.includes(assignment.playStyle)))
    )
      return null;
    if (
      assignment.equipment !== undefined &&
      (!record(assignment.equipment) ||
        Object.entries(assignment.equipment).some(
          ([key, id]) =>
            !['boots', 'pendant', 'bracelet', 'accessory'].includes(key) ||
            !(id === null || (Number.isSafeInteger(id) && Number(id) > 0)),
        ))
    )
      return null;
    if (
      assignment.passives !== undefined &&
      (!Array.isArray(assignment.passives) ||
        assignment.passives.length > 6 ||
        assignment.passives.some(
          (entry) =>
            entry !== null &&
            (!record(entry) ||
              !Number.isSafeInteger(entry.id) ||
              Number(entry.id) <= 0 ||
              typeof entry.value !== 'number' ||
              !Number.isFinite(entry.value) ||
              entry.value < 0 ||
              entry.value > 99999),
        ))
    )
      return null;
    const p = assignment.player;
    if (
      !Number.isSafeInteger(p.id) ||
      Number(p.id) <= 0 ||
      ids.has(Number(p.id)) ||
      !text(p.name, 200) ||
      !(
        p.portraitUrl === null ||
        (text(p.portraitUrl, 2000) && /^https?:\/\//.test(p.portraitUrl))
      ) ||
      !optional(p.position, ['GK', 'DF', 'MF', 'FW']) ||
      !optional(p.element, ['wind', 'forest', 'fire', 'mountain', 'void']) ||
      !optional(p.gender, ['male', 'female', 'neutral']) ||
      !optional(p.playStyle, playStyles) ||
      !(p.role === null || text(p.role, 80)) ||
      !Array.isArray(p.rarities) ||
      p.rarities.length > 7 ||
      !p.rarities.every((r) => typeof r === 'string' && Object.hasOwn(RARITIES, r)) ||
      !p.rarities.includes(assignment.rarity) ||
      !Array.isArray(p.profiles) ||
      p.profiles.length > 6
    )
      return null;
    for (const profile of p.profiles) {
      if (
        !record(profile) ||
        !['common', 'hero', 'basara'].includes(String(profile.rarity)) ||
        ![50, 99].includes(Number(profile.level)) ||
        !record(profile.values)
      )
        return null;
      const values = profile.values;
      if (
        STAT_KEYS.some(
          (key) =>
            values[key] !== null &&
            (typeof values[key] !== 'number' ||
              !Number.isFinite(values[key]) ||
              values[key] < 0 ||
              values[key] > 10000),
        )
      )
        return null;
    }
    if (!eligible(p as unknown as Assignment['player'], slot)) return null;
    ids.add(Number(p.id));
  }
  return value as unknown as Team;
}
export function readDraft(storage: Storage): { team: Team | null; error: string | null } {
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw) return { team: null, error: null };
    const payload: unknown = JSON.parse(raw);
    const team = record(payload) && payload.version === 1 ? decodeTeam(payload.team) : null;
    return {
      team,
      error: team ? null : 'Le brouillon local est illisible. Une nouvelle équipe a été ouverte.',
    };
  } catch {
    return {
      team: null,
      error: 'Le stockage du navigateur est indisponible ou le brouillon est illisible.',
    };
  }
}
export function readTeams(storage: Storage): SavedTeam[] {
  const raw = storage.getItem(TEAMS_KEY);
  if (!raw) return [];
  const payload: unknown = JSON.parse(raw);
  if (
    !record(payload) ||
    payload.version !== 1 ||
    !Array.isArray(payload.teams) ||
    payload.teams.length > 50
  )
    throw new Error('Les équipes locales sont illisibles. Elles n’ont pas été remplacées.');
  return payload.teams.map((entry) => {
    if (!record(entry) || !text(entry.updatedAt, 40) || Number.isNaN(Date.parse(entry.updatedAt)))
      throw new Error('Une équipe locale est illisible.');
    const team = decodeTeam(entry.team);
    if (!team) throw new Error('Une équipe locale est illisible.');
    return { team, updatedAt: entry.updatedAt };
  });
}
export function writeDraft(storage: Storage, team: Team) {
  storage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, team }));
}
export function writeTeams(storage: Storage, teams: SavedTeam[]) {
  storage.setItem(TEAMS_KEY, JSON.stringify({ version: 1, teams }));
}
export function saveTeam(storage: Storage, team: Team): SavedTeam[] {
  const teams = readTeams(storage).filter((saved) => saved.team.id !== team.id);
  if (teams.length >= 50) throw new Error('Vous avez atteint la limite de 50 équipes locales.');
  const next = [{ team, updatedAt: new Date().toISOString() }, ...teams];
  writeTeams(storage, next);
  return next;
}
