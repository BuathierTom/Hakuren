import { catalogueName } from '@/features/catalogue/lib/catalogue-text';
import { t } from '@/features/preferences/lib/i18n';
import type { CSSProperties } from 'react';
import type { Position } from '@shared/catalogue';
import { PositionIcon } from '@/features/catalogue/components/game-icon/game-icon';
import { PlayerCard } from './player-card';
import coach from '../../../../../assets/icons/positions/icon_position_coach.png';
import manager from '../../../../../assets/icons/positions/icon_position_manager.png';
import { RARITIES, type Assignment } from '../../lib/team';
import { assignmentAppearance } from '../../lib/rarity-appearance';
import styles from './team-pitch.module.scss';
interface Props {
  slot: string;
  label: string;
  assignment?: Assignment;
  position?: Position;
  dragging: boolean;
  warning: string | null;
  onClick: () => void;
}
export function PlayerSlot({
  slot,
  label,
  assignment,
  position,
  dragging,
  warning,
  onClick,
}: Props) {
  const appearance = assignment ? assignmentAppearance(assignment) : null;
  const staffIcon = slot === 'coach' ? coach : slot.startsWith('manager-') ? manager : null;
  return (
    <button
      type="button"
      data-slot={slot}
      data-filled={!!assignment}
      data-rarity={assignment?.rarity}
      className={styles.slot}
      style={
        appearance
          ? ({
              '--rarity': appearance.color,
              '--rarity-shadow': appearance.shadow,
            } as CSSProperties)
          : undefined
      }
      aria-label={
        assignment
          ? `${label} : ${catalogueName(assignment.player)}, ${t(RARITIES[assignment.rarity].name)}${warning ? t('. Alerte : {0}', warning) : ''}. Modifier`
          : t('Ajouter un personnage : {0}', label)
      }
      data-dragging={dragging}
      onClick={onClick}
      title={
        assignment
          ? `${catalogueName(assignment.player)} - ${t(RARITIES[assignment.rarity].name)}`
          : label
      }
    >
      {assignment ? (
        <PlayerCard assignment={assignment} warning={warning} />
      ) : (
        <span className={styles.slotInner}>
          <span className={styles.empty}>
            {position ? (
              <PositionIcon position={position} />
            ) : (
              <>
                {staffIcon ? (
                  <img src={staffIcon} width="23" height="23" alt="" />
                ) : (
                  <span className={styles.plus}>+</span>
                )}
                <span>{label}</span>
              </>
            )}
          </span>
        </span>
      )}
    </button>
  );
}
