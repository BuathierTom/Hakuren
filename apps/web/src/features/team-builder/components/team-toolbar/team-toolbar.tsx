import { t } from '@/features/preferences/lib/i18n';
import { useRef, type Ref } from 'react';
import type { Formation } from '@shared/formations';
import { Select } from '@/components/ui/select/select';
import { FolderOpen, ImageDown, Redo2, Save, Trash2, Undo2, WandSparkles } from 'lucide-react';
import type { Team } from '../../lib/team';
import styles from './team-toolbar.module.scss';
interface Props {
  team: Team;
  formations: Formation[];
  canUndo: boolean;
  canRedo: boolean;
  saving?: boolean;
  filling?: boolean;
  fillDisabled?: boolean;
  onFill: () => void;
  exporting?: boolean;
  exportDisabled?: boolean;
  onExport: () => void;
  saveDisabled?: boolean;
  onName: (name: string) => void;
  onFormation: (code: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onTeams: (open: boolean) => void;
  teamsOpen: boolean;
  teamsPopoverId: string;
  teamsButtonRef: Ref<HTMLButtonElement>;
  onClear: () => void;
}
export function TeamToolbar(p: Props) {
  const teamsOpenAtPointerDown = useRef<boolean | null>(null);
  return (
    <section className={styles.toolbar} aria-label={t('Édition de l’équipe')}>
      <label className={styles.name}>
        {t('Nom de l’équipe')}
        <input
          maxLength={120}
          value={p.team.name}
          onChange={(event) => p.onName(event.target.value)}
        />
      </label>
      <Select
        className={styles.formation}
        label={t('Formation')}
        showLabel
        value={p.team.formation}
        options={p.formations.map((formation) => ({
          value: formation.code,
          label: t(formation.name),
        }))}
        onChange={p.onFormation}
        disabled={!p.formations.length}
      />
      <div className={styles.history}>
        <button
          type="button"
          disabled={!p.canUndo}
          onClick={p.onUndo}
          aria-label={t('Annuler la dernière modification')}
          title={t('Annuler la dernière modification')}
        >
          <Undo2 size={17} />
        </button>
        <button
          type="button"
          disabled={!p.canRedo}
          onClick={p.onRedo}
          aria-label={t('Rétablir la modification')}
          title={t('Rétablir la modification')}
        >
          <Redo2 size={17} />
        </button>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          onClick={p.onFill}
          disabled={p.filling || p.fillDisabled}
          aria-busy={p.filling}
          title={t(
            'Remplir les équipements et les passifs vides selon le poste, la rareté et l’archétype',
          )}
        >
          <WandSparkles size={17} />
          <span className={styles.actionLabel} data-pending-label={t('Équipement…')}>
            <span>{p.filling ? t('Équipement…') : t('Équiper l’équipe')}</span>
          </span>
        </button>
        <button
          type="button"
          className={styles.clear}
          disabled={!Object.keys(p.team.slots).length}
          onClick={p.onClear}
        >
          <Trash2 size={17} />
          {t('Vider l’équipe')}
        </button>
        <button
          ref={p.teamsButtonRef}
          type="button"
          popoverTarget={p.teamsPopoverId}
          onPointerDownCapture={() => {
            teamsOpenAtPointerDown.current = p.teamsOpen;
          }}
          onClick={(event) => {
            event.preventDefault();
            const wasOpen = event.detail
              ? (teamsOpenAtPointerDown.current ?? p.teamsOpen)
              : p.teamsOpen;
            teamsOpenAtPointerDown.current = null;
            p.onTeams(!wasOpen);
          }}
          aria-haspopup="dialog"
          aria-expanded={p.teamsOpen}
          aria-controls={p.teamsPopoverId}
        >
          <FolderOpen size={17} />
          {t('Mes équipes')}
        </button>
        <button
          type="button"
          className={styles.save}
          onClick={p.onSave}
          disabled={p.saving || p.saveDisabled}
          aria-busy={p.saving}
        >
          <Save size={17} />
          <span>{t('Enregistrer')}</span>
        </button>
        <button
          type="button"
          className={styles.export}
          onClick={p.onExport}
          disabled={p.exporting || p.exportDisabled}
          aria-busy={p.exporting}
          title={t('Exporter la composition en image PNG')}
        >
          <ImageDown size={17} />
          <span className={styles.actionLabel} data-pending-label={t('Exportation…')}>
            <span>{p.exporting ? t('Exportation…') : t('Exporter')}</span>
          </span>
        </button>
      </div>
    </section>
  );
}
