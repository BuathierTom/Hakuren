import { TeamDialog } from '../team-dialog/team-dialog';
import styles from './clear-team-dialog.module.scss';
export function ClearTeamDialog({
  onConfirm,
  onClose,
}: {
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <TeamDialog title="Vider l’équipe" onClose={onClose}>
      <p className={styles.message}>
        Retirer tous les titulaires, les remplaçants et le staff de cette composition ?
      </p>
      <div className={styles.actions}>
        <button type="button" onClick={onClose}>
          Annuler
        </button>
        <button type="button" className={styles.confirm} onClick={onConfirm}>
          Vider l’équipe
        </button>
      </div>
    </TeamDialog>
  );
}
