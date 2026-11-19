import { useState } from 'react';
import { TeamDialog } from '../team-dialog/team-dialog';
import { teamCounts, type Team, type SavedTeam } from '../../lib/team';
import styles from './saved-teams.module.scss';
interface Props {
  teams: SavedTeam[];
  onLoad: (team: Team) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}
export function SavedTeams({ teams, onLoad, onNew, onDelete, onClose }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);
  return (
    <TeamDialog title="Mes équipes" onClose={onClose}>
      <p className={styles.note}>
        Les équipes sont enregistrées dans ce navigateur. Enregistrez votre brouillon avant d’ouvrir
        une autre équipe pour le retrouver dans cette liste.
      </p>
      <button type="button" className={styles.newTeam} onClick={onNew}>
        Créer une nouvelle équipe
      </button>
      {teams.length === 0 ? (
        <p className={styles.empty}>Aucune équipe enregistrée pour le moment.</p>
      ) : (
        <ul className={styles.list}>
          {teams.map(({ team, updatedAt }) => (
            <li key={team.id}>
              <button type="button" className={styles.load} onClick={() => onLoad(team)}>
                <strong>{team.name}</strong>
                <span>
                  {teamCounts(team).starters}/11 titulaires -{' '}
                  {new Date(updatedAt).toLocaleDateString('fr-FR')}
                </span>
              </button>
              {deleting === team.id ? (
                <div className={styles.confirm}>
                  <span>Supprimer ?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(team.id);
                      setDeleting(null);
                    }}
                  >
                    Oui
                  </button>
                  <button type="button" onClick={() => setDeleting(null)}>
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.delete}
                  onClick={() => setDeleting(team.id)}
                  aria-label={`Supprimer ${team.name}`}
                >
                  Supprimer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </TeamDialog>
  );
}
