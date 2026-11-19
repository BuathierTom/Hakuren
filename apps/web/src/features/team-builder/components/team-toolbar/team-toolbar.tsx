import type { Formation } from '@shared/formations';
import { Icon } from '@/components/ui/icon/icon';
import type { Team } from '../../lib/team';
import styles from './team-toolbar.module.scss';
interface Props {
  team: Team;
  formations: Formation[];
  canUndo: boolean;
  canRedo: boolean;
  onName: (name: string) => void;
  onFormation: (code: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onTeams: () => void;
}
export function TeamToolbar(p: Props) {
  return (
    <section className={styles.toolbar} aria-label="Édition de l’équipe">
      <label className={styles.name}>
        Nom de l’équipe
        <input
          maxLength={120}
          value={p.team.name}
          onChange={(event) => p.onName(event.target.value)}
        />
      </label>
      <label className={styles.formation}>
        Formation
        <select
          value={p.team.formation}
          onChange={(event) => p.onFormation(event.target.value)}
          disabled={!p.formations.length}
        >
          {p.formations.map((formation) => (
            <option key={formation.code} value={formation.code}>
              {formation.name}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.history}>
        <button
          type="button"
          disabled={!p.canUndo}
          onClick={p.onUndo}
          title="Annuler la dernière modification"
        >
          <Icon name="reset" size={17} />
          <span>Annuler</span>
        </button>
        <button
          type="button"
          disabled={!p.canRedo}
          onClick={p.onRedo}
          title="Rétablir la modification"
        >
          <span className={styles.redo}>
            <Icon name="reset" size={17} />
          </span>
          <span>Rétablir</span>
        </button>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          disabled
          title="L’équipement automatique sera disponible prochainement"
        >
          Équiper les cases vides
        </button>
        <button type="button" onClick={p.onTeams}>
          Mes équipes
        </button>
        <button type="button" className={styles.save} onClick={p.onSave}>
          Enregistrer
        </button>
      </div>
    </section>
  );
}
