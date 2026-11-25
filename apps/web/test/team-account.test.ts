import assert from 'node:assert/strict';
import test from 'node:test';
import { TeamAccount } from '../src/features/team-builder/lib/team-account';
import {
  createTeamAccountApi,
  TeamApiError,
  decodeAccountTeam,
  type TeamAccountApi,
} from '../src/features/team-builder/lib/account-api';
import { teamIdentity } from '../src/features/team-builder/lib/team-identity';
import {
  readAccountBackup,
  writeAccountBackup,
  keepAccountRecovery,
  clearAccountRecovery,
} from '../src/features/team-builder/lib/account-backup';
import { exampleTeam } from '../../api/test/helpers/teams';
import type { AccountTeam } from '../../../shared/teams';
function fixture() {
  const teams = new Map<string, AccountTeam>();
  let draft: AccountTeam | null = null;
  const calls: { id: string; revision: number | null; draft: boolean }[] = [];
  const api: TeamAccountApi = {
    async list() {
      return structuredClone([...teams.values()]);
    },
    async draft() {
      return structuredClone(draft);
    },
    async save(team, revision, isDraft) {
      calls.push({ id: team.id, revision, draft: isDraft });
      const current = isDraft ? draft : teams.get(team.id);
      if ((current?.revision ?? null) !== revision)
        throw new TeamApiError('TEAM_CONFLICT', 'Modified elsewhere');
      const result = {
        team: structuredClone(team),
        revision: (current?.revision ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      if (isDraft) draft = result;
      else teams.set(team.id, result);
      return structuredClone(result);
    },
    async remove(id, revision) {
      assert.equal(teams.get(id)?.revision, revision);
      teams.delete(id);
    },
  };
  return { api, teams, calls, getDraft: () => draft };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
test('account teams save, update and delete using server revisions and persist across a fresh client', async () => {
  const f = fixture();
  const account = new TeamAccount(1, f.api);
  await account.load();
  const team = exampleTeam();
  assert.equal(await account.save(team), true);
  assert.equal(await account.save({ ...team, name: 'Updated' }), true);
  assert.deepEqual(
    f.calls.map((call) => call.revision),
    [null, 1],
  );
  const second = new TeamAccount(1, f.api);
  await second.load();
  assert.equal(second.getSnapshot().items[0]?.team.name, 'Updated');
  assert.equal(await second.remove(team.id), true);
  assert.equal(second.getSnapshot().items.length, 0);
});
test('automatic and manual saves of the same composition share one persisted revision', async () => {
  const f = fixture();
  const gate = deferred<void>();
  const entered = deferred<void>();
  const original = f.api.save;
  f.api.save = async (...args) => {
    entered.resolve();
    await gate.promise;
    return original(...args);
  };
  const account = new TeamAccount(1, f.api);
  await account.load();
  const team = exampleTeam();
  const automatic = account.save(team);
  await entered.promise;
  const manual = account.save(structuredClone(team));
  gate.resolve();
  assert.equal(await automatic, true);
  assert.equal(await manual, true);
  assert.equal(f.calls.length, 1);
  assert.equal(account.getSnapshot().items[0]?.revision, 1);
  assert.deepEqual(account.getSnapshot().items[0]?.team, team);
});
test('saved team deduplication tolerates JSON key order and still persists later changes', async () => {
  const f = fixture();
  const account = new TeamAccount(1, f.api);
  await account.load();
  const team = exampleTeam();
  await account.save(team);
  const reversed = JSON.parse(
    JSON.stringify(team, (_key, value) =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).reverse())
        : value,
    ),
  );
  assert.equal(await account.save(reversed), true);
  assert.equal(f.calls.length, 1);
  await account.save({ ...team, name: 'Automatically updated' });
  assert.equal(f.calls.length, 2);
  assert.equal(account.getSnapshot().items[0]?.revision, 2);
});
test('rapid draft edits serialize revisions and coalesce changes made during an in-flight save', async () => {
  const f = fixture();
  const gate = deferred<void>();
  const entered = deferred<void>();
  const original = f.api.save;
  let count = 0;
  f.api.save = async (...args) => {
    if (++count === 1) {
      entered.resolve();
      await gate.promise;
    }
    return original(...args);
  };
  const account = new TeamAccount(1, f.api);
  await account.load();
  const first = account.saveDraft({ ...exampleTeam(), name: 'One' });
  await entered.promise;
  const second = account.saveDraft({ ...exampleTeam(), name: 'Two' });
  const third = account.saveDraft({ ...exampleTeam(), name: 'Three' });
  gate.resolve();
  assert.equal(await first, true);
  await second;
  await third;
  assert.equal(account.getSnapshot().draft?.team.name, 'Three');
  assert.equal(account.getSnapshot().draft?.revision, 2);
  assert.deepEqual(
    f.calls.map((call) => call.revision),
    [null, 1],
  );
});
test('MySQL JSON key ordering cannot make a synced draft dirty or duplicate imported teams', async () => {
  const f = fixture();
  const account = new TeamAccount(1, f.api);
  await account.load();
  const team = exampleTeam();
  await account.saveDraft(team);
  const reversed = JSON.parse(
    JSON.stringify(team, (_key, value) =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).reverse())
        : value,
    ),
  );
  assert.equal(teamIdentity(team), teamIdentity(reversed));
  await account.saveDraft(reversed);
  assert.equal(f.calls.length, 1);
  await account.save(team);
  assert.equal(
    await account.importTeams([{ team: reversed, updatedAt: new Date().toISOString() }]),
    true,
  );
  assert.equal(account.getSnapshot().items.length, 1);
});
test('a failed save stays visible after a successful autosave and retry preserves all loadout data', async () => {
  const f = fixture();
  const original = f.api.save;
  let fail = true;
  f.api.save = async (...args) => {
    if (!args[2] && fail) throw new TeamApiError('TEAMS_UNAVAILABLE', 'Offline');
    return original(...args);
  };
  const account = new TeamAccount(1, f.api);
  await account.load();
  const team = exampleTeam();
  assert.equal(await account.save(team), false);
  await account.saveDraft(team);
  assert.equal(account.getSnapshot().items.length, 0);
  assert.equal(account.getSnapshot().error, 'Offline');
  assert.equal(account.getSnapshot().errorOperation, 'save');
  fail = false;
  assert.equal(await account.save(team), true);
  assert.deepEqual(account.getSnapshot().items[0]?.team, team);
  assert.equal(account.getSnapshot().error, null);
});
test('stale writes and account changes block queued mutations instead of overwriting remote progress', async () => {
  const f = fixture();
  const account = new TeamAccount(1, f.api);
  await account.load();
  const team = exampleTeam();
  await account.save(team);
  await f.api.save({ ...team, name: 'Another device' }, 1, false, new AbortController().signal);
  assert.equal(await account.save({ ...team, name: 'Stale edit' }), false);
  assert(account.getSnapshot().blocked);
  const before = f.calls.length;
  assert.equal(await account.saveDraft(team), false);
  assert.equal(await account.remove(team.id), false);
  assert.equal(f.calls.length, before);
  assert.equal(f.teams.get(team.id)?.team.name, 'Another device');
  await account.load();
  assert(!account.getSnapshot().blocked);
  assert.equal(account.getSnapshot().items[0]?.revision, 2);
});
test('aborted account loads and pending writes cannot repopulate a new session state', async () => {
  const f = fixture();
  const first = deferred<AccountTeam[]>();
  let calls = 0;
  f.api.list = () => (++calls === 1 ? first.promise : Promise.resolve([]));
  const account = new TeamAccount(1, f.api);
  const old = account.load();
  account.close();
  await account.load();
  first.resolve([{ team: exampleTeam(), revision: 1, updatedAt: new Date().toISOString() }]);
  await old;
  assert.equal(account.getSnapshot().items.length, 0);
  const gate = deferred<void>();
  const original = f.api.save;
  f.api.save = async (...args) => {
    await gate.promise;
    return original(...args);
  };
  const save = account.save(exampleTeam());
  await Promise.resolve();
  account.close();
  await account.load();
  gate.resolve();
  assert.equal(await save, false);
  assert.equal(account.getSnapshot().items.length, 0);
});
test('local import retains an existing account version and is repeatable after partial failure', async () => {
  const f = fixture();
  const account = new TeamAccount(1, f.api);
  await account.load();
  const team = exampleTeam();
  await account.save({ ...team, name: 'Account version' });
  const original = f.api.save;
  let fail = true;
  f.api.save = async (...args) => {
    if (args[0].id === 'second' && fail) throw new TeamApiError('TEAMS_UNAVAILABLE', 'Offline');
    return original(...args);
  };
  const entries = [
    { team, updatedAt: new Date().toISOString() },
    { team: { ...team, id: 'second', name: 'Second local' }, updatedAt: new Date().toISOString() },
  ];
  assert.equal(await account.importTeams(entries), false);
  assert.equal(account.getSnapshot().items.length, 2);
  assert.equal(f.teams.get(team.id)?.team.name, 'Account version');
  fail = false;
  assert.equal(await account.importTeams(entries), true);
  assert.equal(account.getSnapshot().items.length, 3);
  assert.equal(await account.importTeams(entries), true);
  assert.equal(account.getSnapshot().items.length, 3);
});
test('browser backups and recovery copies are isolated by account and do not touch anonymous teams', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  } as Storage;
  storage.setItem('hakuren.team-draft.v1', 'anonymous');
  const backup = { team: exampleTeam(), revision: 4 };
  writeAccountBackup(storage, 1, backup);
  assert.deepEqual(readAccountBackup(storage, 1), backup);
  assert.equal(readAccountBackup(storage, 2), null);
  keepAccountRecovery(storage, 1, backup);
  writeAccountBackup(storage, 1, { team: { ...backup.team, name: 'New' }, revision: 5 });
  assert.equal(readAccountBackup(storage, 1, true)?.team.name, 'Hakuren');
  assert.equal(storage.getItem('hakuren.team-draft.v1'), 'anonymous');
  clearAccountRecovery(storage, 1);
  assert.equal(readAccountBackup(storage, 1, true), null);
});
test('the private transport binds every request to the expected account and rejects malformed saved data', async () => {
  const calls: RequestInit[] = [];
  const request = (async (_url, options) => {
    calls.push(options!);
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  }) as typeof fetch;
  const api = createTeamAccountApi(42, request);
  await api.list(new AbortController().signal);
  assert.equal((calls[0]?.headers as Record<string, string>)['X-Hakuren-Account'], '42');
  assert.equal(calls[0]?.credentials, 'same-origin');
  assert.equal(calls[0]?.cache, 'no-store');
  assert.throws(() =>
    decodeAccountTeam({ team: exampleTeam(), revision: 0, updatedAt: new Date().toISOString() }),
  );
  assert.throws(() =>
    decodeAccountTeam({ team: exampleTeam(), revision: 1, updatedAt: 'invalid' }),
  );
  const forbidden = createTeamAccountApi(
    42,
    (async () =>
      new Response(JSON.stringify({ error: 'ACCOUNT_CHANGED', message: 'Changed' }), {
        status: 409,
      })) as typeof fetch,
  );
  await assert.rejects(
    forbidden.list(new AbortController().signal),
    (error) => error instanceof TeamApiError && error.code === 'ACCOUNT_CHANGED',
  );
});
