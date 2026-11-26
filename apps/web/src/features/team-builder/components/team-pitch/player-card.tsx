import { catalogueName } from '@/features/catalogue/lib/catalogue-text';
import { t } from '@/features/preferences/lib/i18n';
import type { Assignment } from '../../lib/team';
import { playerSurname } from '../../lib/player-name';
import { ElementIcon, PositionIcon } from '@/features/catalogue/components/game-icon/game-icon';
import { Portrait } from '@/features/catalogue/components/player-portrait/player-portrait';
import { Icon } from '@/components/ui/icon/icon';
import styles from './team-pitch.module.scss';
export function PlayerCard({
  assignment,
  warning,
}: {
  assignment: Assignment;
  warning?: string | null;
}) {
  return (
    <span className={styles.slotInner}>
      <span className={styles.playerInfo}>
        <ElementIcon element={assignment.player.element} />
        {assignment.player.position && <PositionIcon position={assignment.player.position} />}
        <strong>{playerSurname(catalogueName(assignment.player))}</strong>
      </span>
      {warning && (
        <span
          className={styles.warning}
          role="img"
          aria-label={t('Alerte : {0}', warning)}
          title={warning}
        >
          <Icon name="warning" size={14} />
        </span>
      )}
      <span className={styles.portrait}>
        <Portrait small src={assignment.player.portraitUrl} />
      </span>
    </span>
  );
}
