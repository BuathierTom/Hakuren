import { useNotifications } from '@/features/notifications/notification-context';
import { teamIdentity } from '../lib/team-identity';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { emptyTeam, teamReducer, type Team, type SavedTeam } from '../lib/team';
import { readDraft, readTeams, saveTeam, writeDraft, writeTeams, TEAMS_KEY } from '../lib/storage';
import {
  readAccountBackup,
  writeAccountBackup,
  keepAccountRecovery,
  clearAccountRecovery,
  importReceiptKey,
} from '../lib/account-backup';
import type { TeamAccount, TeamAccountState } from '../lib/team-account';
const same = (a: unknown, b: unknown) => teamIdentity(a) === teamIdentity(b);
export function useTeamBuilder(
  account: TeamAccount | null = null,
  remote: TeamAccountState | null = null,
) {
  const { notify, dismiss } = useNotifications();
  const [initial] = useState(() => {
    try {
      if (!account) return { ...readDraft(window.localStorage), recovery: null as Team | null };
      const backup = readAccountBackup(window.localStorage, account.userId);
      const recovery = readAccountBackup(window.localStorage, account.userId, true)?.team ?? null;
      const revision = remote?.draft?.revision ?? null;
      const stale =
        backup && !same(backup.team, remote?.draft?.team) && backup.revision !== revision;
      if (stale) keepAccountRecovery(window.localStorage, account.userId, backup);
      return {
        team:
          backup && !stale ? backup.team : (remote?.draft?.team ?? remote?.items[0]?.team ?? null),
        error: null,
        recovery: stale ? backup.team : recovery,
      };
    } catch {
      return {
        team: remote?.draft?.team ?? null,
        error: 'Le stockage local est indisponible. La sauvegarde sur le compte reste accessible.',
        recovery: null as Team | null,
      };
    }
  });
  const [history, dispatch] = useReducer(teamReducer, {
    past: [],
    present: initial.team ?? emptyTeam(),
    future: [],
  });
  const [saving, setSaving] = useState(false);
  const savingNow = useRef(false);
  const present = useRef(history.present);
  present.current = history.present;
  const errorId = `team-sync-${account?.userId ?? 'guest'}`;
  const [retryVersion, retry] = useReducer((version: number) => version + 1, 0);
  const retrySave = useCallback(() => {
    const state = account?.getSnapshot();
    if (state?.errorCode === 'ACCOUNT_CHANGED' || state?.errorCode === 'LOGIN_REQUIRED')
      window.location.reload();
    else if (state?.blocked || state?.errorOperation === 'delete') void account?.load();
    else if (state?.errorOperation === 'save') void account?.save(present.current);
    else retry();
  }, [account]);
  useEffect(() => {
    if (initial.error) notify({ id: 'team-local-initial', message: initial.error, tone: 'error' });
  }, [initial.error, notify]);
  useEffect(() => {
    if (!remote?.error) {
      dismiss(errorId);
      return;
    }
    notify({
      id: errorId,
      message: remote.error,
      tone: 'error',
      action: {
        label: remote.blocked ? 'Recharger depuis le compte' : 'Réessayer',
        onClick: retrySave,
      },
    });
  }, [remote?.error, remote?.blocked, errorId, notify, dismiss, retrySave]);
  useEffect(() => () => dismiss(errorId), [errorId, dismiss]);
  const [localTeams, setLocalTeams] = useState<SavedTeam[]>([]);
  const [imports, setImports] = useState<SavedTeam[]>([]);
  const [recovery, setRecovery] = useState<Team | null>(initial.recovery);
  const [localDraft, setLocalDraft] = useState<Team | null>(null);
  const [receiptVersion, refreshReceipt] = useReducer((version: number) => version + 1, 0);
  useEffect(() => {
    const refresh = () => {
      try {
        const teams = readTeams(window.localStorage);
        setLocalTeams(teams);
        if (account) {
          const receipt = window.localStorage.getItem(importReceiptKey(account.userId));
          const imported = receipt ? (JSON.parse(receipt) as unknown) : [];
          if (!Array.isArray(imported)) throw new Error('Import local illisible.');
          setImports(teams.filter((entry) => !imported.includes(JSON.stringify(entry))));
          const draft = readDraft(window.localStorage).team;
          setLocalDraft(
            draft &&
              Object.keys(draft.slots).length &&
              !imported.includes('draft:' + teamIdentity(draft))
              ? draft
              : null,
          );
        }
      } catch {
        notify({
          id: 'team-local-read',
          message:
            'Impossible de lire les équipes locales. Les données existantes sont conservées.',
          tone: 'error',
        });
      }
    };
    refresh();
    const listener = (event: StorageEvent) => {
      if (event.key === TEAMS_KEY) refresh();
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, [account, receiptVersion, notify]);
  useEffect(() => {
    try {
      if (account)
        writeAccountBackup(window.localStorage, account.userId, {
          team: history.present,
          revision: remote?.draft?.revision ?? null,
        });
      else writeDraft(window.localStorage, history.present);
    } catch {
      notify({
        id: 'team-local-backup',
        message: 'La copie locale du brouillon ne peut pas être enregistrée dans ce navigateur.',
        tone: 'error',
      });
    }
  }, [account, history.present, remote?.draft?.revision, notify]);
  useEffect(() => {
    if (!account || !remote?.ready || remote.blocked) return;
    const team = history.present;
    const sync = () => {
      const state = account.getSnapshot();
      if (!state.ready || state.blocked) return;
      if (!same(team, state.draft?.team)) void account.saveDraft(team);
      const saved = state.items.find((entry) => entry.team.id === team.id);
      if (team.name.trim() && !same(team, saved?.team) && (history.past.length > 0 || saved))
        void account.save(team);
    };
    const timeout = window.setTimeout(sync, 700);
    return () => {
      window.clearTimeout(timeout);
      if (present.current.id !== team.id) sync();
    };
  }, [account, history.present, remote?.ready, remote?.blocked, retryVersion]);
  useEffect(() => {
    if (!account) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!same(history.present, remote?.draft?.team)) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [account, history.present, remote?.draft?.team]);
  const change = (update: Team | ((team: Team) => Team)) => {
    try {
      dispatch({
        type: 'change',
        team: typeof update === 'function' ? update(history.present) : update,
      });
      return true;
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : 'Cette modification est impossible.',
        tone: 'error',
      });
      return false;
    }
  };
  const save = async () => {
    if (savingNow.current) return;
    if (!history.present.name.trim()) {
      notify({ message: 'Donne un nom à ton équipe avant de l’enregistrer.', tone: 'error' });
      return;
    }
    savingNow.current = true;
    setSaving(true);
    try {
      if (account) {
        const saved = account.save(history.present);
        void account.saveDraft(history.present);
        if (await saved)
          notify({ message: 'Équipe enregistrée sur ton compte Hakuren.', tone: 'success' });
        return;
      }
      setLocalTeams(saveTeam(window.localStorage, history.present));
      notify({
        message:
          'Équipe enregistrée dans ce navigateur. Connecte-toi avec Discord pour la sauvegarder sur ton compte.',
        tone: 'success',
      });
    } catch (error) {
      notify({
        message:
          error instanceof Error && error.name !== 'QuotaExceededError'
            ? error.message
            : 'Le stockage local est plein ou indisponible.',
        tone: 'error',
      });
    } finally {
      savingNow.current = false;
      setSaving(false);
    }
  };
  const removeSaved = async (id: string) => {
    if (account) {
      if (await account.remove(id)) notify({ message: 'Équipe supprimée.', tone: 'success' });
      return;
    }
    try {
      const next = readTeams(window.localStorage).filter((entry) => entry.team.id !== id);
      writeTeams(window.localStorage, next);
      setLocalTeams(next);
      notify({ message: 'Équipe supprimée.', tone: 'success' });
    } catch {
      notify({ message: 'Impossible de supprimer cette équipe du stockage local.', tone: 'error' });
    }
  };
  const importLocal = async () => {
    if (!account || !(await account.importTeams(imports))) return;
    try {
      const previous = JSON.parse(
        window.localStorage.getItem(importReceiptKey(account.userId)) ?? '[]',
      ) as unknown[];
      window.localStorage.setItem(
        importReceiptKey(account.userId),
        JSON.stringify(
          [...new Set([...previous, ...imports.map((entry) => JSON.stringify(entry))])].slice(-100),
        ),
      );
      refreshReceipt();
    } catch {
      setImports([]);
    }
    notify({ message: 'Les équipes locales ont été ajoutées à ton compte.', tone: 'success' });
  };
  const resume = (team: Team) => {
    change({ ...team, id: crypto.randomUUID() });
    notify({ message: 'Le brouillon a été repris dans une nouvelle équipe.', tone: 'success' });
    setRecovery(null);
    setLocalDraft(null);
    if (account) {
      try {
        clearAccountRecovery(window.localStorage, account.userId);
        const receipt = JSON.parse(
          window.localStorage.getItem(importReceiptKey(account.userId)) ?? '[]',
        ) as unknown[];
        window.localStorage.setItem(
          importReceiptKey(account.userId),
          JSON.stringify([...receipt, 'draft:' + teamIdentity(team)].slice(-100)),
        );
      } catch {}
    }
  };
  const teams = remote?.items ?? localTeams;
  return {
    team: history.present,
    teams,
    change,
    save,
    saving,
    removeSaved,
    imports,
    importLocal,
    recovery,
    localDraft,
    resume,
    busy: remote?.busy ?? false,
    error: remote?.error ?? null,
    blocked: remote?.blocked ?? false,
    retry: retrySave,
    reload: () => {
      if (account) void account.load();
    },
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),
  };
}
