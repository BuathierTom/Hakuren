import { useEffect, useReducer, useState } from 'react';
import { emptyTeam, teamReducer, type Team, type SavedTeam } from '../lib/team';
import { readDraft, readTeams, saveTeam, writeDraft, writeTeams, TEAMS_KEY } from '../lib/storage';
export function useTeamBuilder() {
  const [initial] = useState(() => {
    try {
      return readDraft(window.localStorage);
    } catch {
      return { team: null, error: 'Le stockage local est désactivé dans ce navigateur.' };
    }
  });
  const [history, dispatch] = useReducer(teamReducer, {
    past: [],
    present: initial.team ?? emptyTeam(),
    future: [],
  });
  const [notice, setNotice] = useState(initial.error ?? '');
  const [teams, setTeams] = useState<SavedTeam[]>([]);
  useEffect(() => {
    const refresh = () => {
      try {
        setTeams(readTeams(window.localStorage));
      } catch {
        setNotice(
          'Impossible de lire les équipes locales. Les données existantes sont conservées.',
        );
      }
    };
    refresh();
    const listener = (event: StorageEvent) => {
      if (event.key === TEAMS_KEY) refresh();
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, []);
  useEffect(() => {
    try {
      writeDraft(window.localStorage, history.present);
    } catch {
      setNotice(
        'Le brouillon ne peut pas être sauvegardé : le stockage local est plein ou indisponible.',
      );
    }
  }, [history.present]);
  const change = (update: Team | ((team: Team) => Team)) => {
    try {
      dispatch({
        type: 'change',
        team: typeof update === 'function' ? update(history.present) : update,
      });
      setNotice('');
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Cette modification est impossible.');
      return false;
    }
  };
  const save = () => {
    if (!history.present.name.trim()) {
      setNotice('Donnez un nom à votre équipe avant de l’enregistrer.');
      return;
    }
    try {
      setTeams(saveTeam(window.localStorage, history.present));
      setNotice('Équipe enregistrée dans ce navigateur.');
    } catch (error) {
      setNotice(
        error instanceof Error && error.name !== 'QuotaExceededError'
          ? error.message
          : 'Le stockage local est plein ou indisponible.',
      );
    }
  };
  const removeSaved = (id: string) => {
    try {
      const next = readTeams(window.localStorage).filter((entry) => entry.team.id !== id);
      writeTeams(window.localStorage, next);
      setTeams(next);
    } catch {
      setNotice('Impossible de supprimer cette équipe du stockage local.');
    }
  };
  return {
    team: history.present,
    teams,
    notice,
    setNotice,
    change,
    save,
    removeSaved,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),
    dirty: !teams.some((saved) => JSON.stringify(saved.team) === JSON.stringify(history.present)),
  };
}
