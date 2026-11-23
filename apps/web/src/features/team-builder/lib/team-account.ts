import { teamIdentity } from './team-identity';
import type { AccountTeam, Team, SavedTeam } from '@shared/teams';
import { createTeamAccountApi, TeamApiError, type TeamAccountApi } from './account-api';
export interface TeamAccountState {
  items: AccountTeam[];
  draft: AccountTeam | null;
  loading: boolean;
  ready: boolean;
  busy: boolean;
  blocked: boolean;
  error: string | null;
  errorCode: string | null;
  errorOperation: 'save' | 'draft' | 'delete' | null;
  loadVersion: number;
}
export class TeamAccount {
  private state: TeamAccountState = {
    items: [],
    draft: null,
    loading: true,
    ready: false,
    busy: false,
    blocked: false,
    error: null,
    errorCode: null,
    errorOperation: null,
    loadVersion: 0,
  };
  private listeners = new Set<() => void>();
  private controller: AbortController | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private draftTarget: Team | null = null;
  private draftFlight: Promise<boolean> | null = null;
  constructor(
    public readonly userId: number,
    private api: TeamAccountApi = createTeamAccountApi(userId),
  ) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<TeamAccountState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  close = () => {
    this.controller?.abort();
    this.draftTarget = null;
    this.draftFlight = null;
  };
  async load() {
    this.close();
    const controller = new AbortController();
    this.controller = controller;
    this.queue = Promise.resolve();
    this.update({
      loading: true,
      ready: false,
      busy: false,
      error: null,
      errorCode: null,
      errorOperation: null,
      blocked: false,
    });
    try {
      const [items, draft] = await Promise.all([
        this.api.list(controller.signal),
        this.api.draft(controller.signal),
      ]);
      if (!controller.signal.aborted)
        this.update({
          items,
          draft,
          loading: false,
          ready: true,
          loadVersion: this.state.loadVersion + 1,
        });
    } catch (error) {
      if (!controller.signal.aborted)
        this.update({
          loading: false,
          error:
            error instanceof Error ? error.message : 'Les équipes du compte sont indisponibles.',
        });
    }
  }
  private run(
    operation: 'save' | 'draft' | 'delete',
    action: (signal: AbortSignal) => Promise<void>,
  ): Promise<boolean> {
    const controller = this.controller;
    if (!controller || controller.signal.aborted || !this.state.ready || this.state.blocked)
      return Promise.resolve(false);
    const result = this.queue.then(async () => {
      if (controller.signal.aborted || this.state.blocked) return false;
      this.update({
        busy: true,
        ...(this.state.errorOperation === operation
          ? { error: null, errorCode: null, errorOperation: null }
          : {}),
      });
      try {
        await action(controller.signal);
        return !controller.signal.aborted;
      } catch (error) {
        if (!controller.signal.aborted)
          this.update({
            error:
              error instanceof TeamApiError
                ? error.message
                : 'La sauvegarde du compte a échoué. Tes modifications restent dans ce navigateur.',
            errorCode: error instanceof TeamApiError ? error.code : null,
            errorOperation: operation,
            blocked:
              error instanceof TeamApiError &&
              ['TEAM_CONFLICT', 'ACCOUNT_CHANGED', 'LOGIN_REQUIRED'].includes(error.code),
          });
        return false;
      } finally {
        if (!controller.signal.aborted) this.update({ busy: false });
      }
    });
    this.queue = result;
    return result;
  }
  save(team: Team) {
    return this.run('save', async (signal) => {
      const revision =
        this.state.items.find((entry) => entry.team.id === team.id)?.revision ?? null;
      const saved = await this.api.save(team, revision, false, signal);
      if (!signal.aborted)
        this.update({
          items: [saved, ...this.state.items.filter((entry) => entry.team.id !== team.id)],
        });
    });
  }
  remove(id: string) {
    return this.run('delete', async (signal) => {
      const entry = this.state.items.find((saved) => saved.team.id === id);
      if (!entry) return;
      await this.api.remove(id, entry.revision, signal);
      if (!signal.aborted)
        this.update({ items: this.state.items.filter((saved) => saved.team.id !== id) });
    });
  }
  saveDraft(team: Team): Promise<boolean> {
    this.draftTarget = team;
    if (this.draftFlight) return this.draftFlight;
    const result = this.run('draft', async (signal) => {
      while (this.draftTarget && !signal.aborted) {
        const target = this.draftTarget;
        this.draftTarget = null;
        if (teamIdentity(target) === teamIdentity(this.state.draft?.team)) continue;
        const draft = await this.api.save(target, this.state.draft?.revision ?? null, true, signal);
        if (!signal.aborted) this.update({ draft });
      }
    });
    this.draftFlight = result;
    void result.finally(() => {
      if (this.draftFlight === result) this.draftFlight = null;
    });
    return result;
  }
  async importTeams(teams: SavedTeam[]) {
    const content = (team: Team) => teamIdentity({ ...team, id: '' });
    for (const entry of teams) {
      if (this.state.items.some((saved) => content(saved.team) === content(entry.team))) continue;
      const team = this.state.items.some((saved) => saved.team.id === entry.team.id)
        ? { ...entry.team, id: crypto.randomUUID() }
        : entry.team;
      if (!(await this.save(team))) return false;
    }
    return true;
  }
}
