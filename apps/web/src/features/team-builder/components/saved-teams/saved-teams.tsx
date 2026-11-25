import { useState } from 'react';
import { Icon } from '@/components/ui/icon/icon';
import { Popover } from '@/components/ui/popover/popover';
import { teamCounts, type Team, type SavedTeam } from '../../lib/team';
import styles from './saved-teams.module.scss';
interface Props {
  id: string;
  anchor: HTMLButtonElement | null;
  teams: SavedTeam[];
  onLoad: (team: Team) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  busy?: boolean;
  imports?: number;
  onImport?: () => void;
  localDraft?: Team | null;
  onResume?: (team: Team) => void;
}
export function SavedTeams({
  id,
  anchor,
  teams,
  onLoad,
  onNew,
  onDelete,
  onClose,
  busy = false,
  imports = 0,
  onImport,
  localDraft,
  onResume,
}: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);
  return (
    <Popover
      id={id}
      anchor={anchor}
      label="Mes équipes"
      onClose={onClose}
      placement="bottom"
      className={styles.popover}
    >
      <header className={styles.heading}>
        <h2>Mes équipes</h2>
        <button
          type="button"
          aria-label="Fermer mes équipes"
          onClick={() => {
            anchor?.focus({ preventScroll: true });
            onClose();
          }}
        >
          <Icon name="close" size={18} />
        </button>
      </header>
      <div className={styles.body}>
        <button type="button" className={styles.newTeam} onClick={onNew}>
          Créer une nouvelle équipe
        </button>
        {imports > 0 && (
          <div className={styles.import}>
            <p>
              {imports} équipe{imports > 1 ? 's' : ''} enregistrée{imports > 1 ? 's' : ''} dans ce
              navigateur.
            </p>
            <button type="button" disabled={busy} onClick={onImport}>
              Importer sur mon compte
            </button>
          </div>
        )}
        {localDraft && onResume && (
          <div className={styles.import}>
            <p>Une copie locale de « {localDraft.name} » est disponible.</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onResume(localDraft);
                onClose();
              }}
            >
              Reprendre dans une nouvelle équipe
            </button>
          </div>
        )}
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
                      disabled={busy}
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
                    disabled={busy}
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
      </div>
    </Popover>
  );
}
