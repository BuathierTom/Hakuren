import { useState } from 'react';
import { Icon } from '@/components/ui/icon/icon';
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
                  <button
                    type="button"
                    className={styles.confirmDelete}
                    aria-label={`Confirmer la suppression de ${team.name}`}
                    title="Confirmer la suppression"
                    onClick={() => {
                      onDelete(team.id);
                      setDeleting(null);
                    }}
                  >
                    <Icon name="check" size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Annuler la suppression de ${team.name}`}
                    title="Annuler la suppression"
                    onClick={() => setDeleting(null)}
                  >
                    <Icon name="close" size={18} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.delete}
                  onClick={() => setDeleting(team.id)}
                  aria-label={`Supprimer ${team.name}`}
                  title="Supprimer l’équipe"
                >
                  <Icon name="trash" size={18} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </TeamDialog>
  );
}
