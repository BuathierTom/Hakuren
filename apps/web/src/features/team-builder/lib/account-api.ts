import type { AccountTeam, Team } from '@shared/teams';
import { decodeTeam } from './storage';
export class TeamApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export interface TeamAccountApi {
  list(signal: AbortSignal): Promise<AccountTeam[]>;
  draft(signal: AbortSignal): Promise<AccountTeam | null>;
  save(
    team: Team,
    revision: number | null,
    draft: boolean,
    signal: AbortSignal,
  ): Promise<AccountTeam>;
  remove(id: string, revision: number, signal: AbortSignal): Promise<void>;
}
export function decodeAccountTeam(value: unknown): AccountTeam {
  if (!value || typeof value !== 'object') throw new Error('Équipe du compte illisible.');
  const row = value as Record<string, unknown>;
  const team = decodeTeam(row.team);
  if (
    !team ||
    !Number.isSafeInteger(row.revision) ||
    Number(row.revision) < 1 ||
    typeof row.updatedAt !== 'string' ||
    Number.isNaN(Date.parse(row.updatedAt))
  )
    throw new Error('Équipe du compte illisible.');
  return { team, revision: Number(row.revision), updatedAt: row.updatedAt };
}
export function createTeamAccountApi(
  userId: number,
  request: typeof fetch = fetch,
): TeamAccountApi {
  async function send(path: string, signal: AbortSignal, method = 'GET', body?: unknown) {
    const response = await request(`/api/me/${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-Hakuren-Account': String(userId),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;
      throw new TeamApiError(
        error?.error ?? 'TEAMS_UNAVAILABLE',
        error?.message ??
          'Impossible de joindre les équipes du compte. Tes modifications restent dans ce navigateur.',
      );
    }
    return response.status === 204 ? null : (response.json() as Promise<unknown>);
  }
  return {
    async list(signal) {
      const data = (await send('teams', signal)) as { items?: unknown };
      if (!Array.isArray(data?.items) || data.items.length > 50)
        throw new Error('Liste des équipes illisible.');
      return data.items.map(decodeAccountTeam);
    },
    async draft(signal) {
      const data = (await send('team-draft', signal)) as { draft?: unknown };
      if (!data || !Object.hasOwn(data, 'draft')) throw new Error('Brouillon du compte illisible.');
      return data.draft === null ? null : decodeAccountTeam(data.draft);
    },
    async save(team, revision, draft, signal) {
      return decodeAccountTeam(
        await send(draft ? 'team-draft' : `teams/${encodeURIComponent(team.id)}`, signal, 'PUT', {
          team,
          revision,
        }),
      );
    },
    async remove(id, revision, signal) {
      await send(`teams/${encodeURIComponent(id)}`, signal, 'DELETE', { revision });
    },
  };
}
