import { locale, t } from '@/features/preferences/lib/i18n';
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
      label={t('Mes équipes')}
      onClose={onClose}
      placement="bottom"
      className={styles.popover}
    >
      <header className={styles.heading}>
        <h2>{t('Mes équipes')}</h2>
        <button
          type="button"
          aria-label={t('Fermer mes équipes')}
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
          {t('Créer une nouvelle équipe')}
        </button>
        {imports > 0 && (
          <div className={styles.import}>
            <p>
              {imports} {t('équipe')}
              {imports > 1 ? 's' : ''} {t('enregistrée')}
              {imports > 1 ? 's' : ''} dans ce navigateur.
            </p>
            <button type="button" disabled={busy} onClick={onImport}>
              {t('Importer sur mon compte')}
            </button>
          </div>
        )}
        {localDraft && onResume && (
          <div className={styles.import}>
            <p>
              {t('Une copie locale de «')} {localDraft.name} {t('» est disponible.')}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onResume(localDraft);
                onClose();
              }}
            >
              {t('Reprendre dans une nouvelle équipe')}
            </button>
          </div>
        )}
        {teams.length === 0 ? (
          <p className={styles.empty}>{t('Aucune équipe enregistrée pour le moment.')}</p>
        ) : (
          <ul className={styles.list}>
            {teams.map(({ team, updatedAt }) => (
              <li key={team.id}>
                <button type="button" className={styles.load} onClick={() => onLoad(team)}>
                  <strong>{team.name}</strong>
                  <span>
                    {teamCounts(team).starters}
                    {t('/11 titulaires -')} {new Date(updatedAt).toLocaleDateString(locale())}
                  </span>
                </button>
                {deleting === team.id ? (
                  <div className={styles.confirm}>
                    <button
                      type="button"
                      className={styles.confirmDelete}
                      aria-label={t('Confirmer la suppression de {0}', team.name)}
                      title={t('Confirmer la suppression')}
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
                      aria-label={t('Annuler la suppression de {0}', team.name)}
                      title={t('Annuler la suppression')}
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
                    aria-label={t('Supprimer {0}', team.name)}
                    title={t('Supprimer l’équipe')}
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
