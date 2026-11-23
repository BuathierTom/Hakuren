import type { Formation } from '@shared/formations';
import { Select } from '@/components/ui/select/select';
import { Icon } from '@/components/ui/icon/icon';
import type { Team } from '../../lib/team';
import styles from './team-toolbar.module.scss';
interface Props {
  team: Team;
  formations: Formation[];
  canUndo: boolean;
  canRedo: boolean;
  saving?: boolean;
  saveDisabled?: boolean;
  onName: (name: string) => void;
  onFormation: (code: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onTeams: () => void;
  onClear: () => void;
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
      <Select
        className={styles.formation}
        label="Formation"
        showLabel
        value={p.team.formation}
        options={p.formations.map((formation) => ({
          value: formation.code,
          label: formation.name,
        }))}
        onChange={p.onFormation}
        disabled={!p.formations.length}
      />
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
          className={styles.clear}
          disabled={!Object.keys(p.team.slots).length}
          onClick={p.onClear}
        >
          Vider l’équipe
        </button>
        <button type="button" onClick={p.onTeams}>
          Mes équipes
        </button>
        <button
          type="button"
          className={styles.save}
          onClick={p.onSave}
          disabled={p.saving || p.saveDisabled}
          aria-busy={p.saving}
        >
          <span>{p.saving ? 'Enregistrement…' : 'Enregistrer'}</span>
        </button>
      </div>
    </section>
  );
}
