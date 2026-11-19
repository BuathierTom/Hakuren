import type { CSSProperties } from 'react';
import type { Position } from '@shared/catalogue';
import { PositionIcon } from '@/features/catalogue/components/game-icon/game-icon';
import { PlayerCard } from './player-card';
import coach from '../../../../../assets/icons/positions/icon_position_coach.png';
import manager from '../../../../../assets/icons/positions/icon_position_manager.png';
import { RARITIES, type Assignment } from '../../lib/team';
import styles from './team-pitch.module.scss';
interface Props {
  slot: string;
  label: string;
  assignment?: Assignment;
  position?: Position;
  dragging: boolean;
  onClick: () => void;
}
export function PlayerSlot({ slot, label, assignment, position, dragging, onClick }: Props) {
  const staffIcon = slot === 'coach' ? coach : slot.startsWith('manager-') ? manager : null;
  return (
    <button
      type="button"
      data-slot={slot}
      data-filled={!!assignment}
      data-rarity={assignment?.rarity}
      className={styles.slot}
      style={
        assignment
          ? ({ '--rarity': RARITIES[assignment.rarity].color } as CSSProperties)
          : undefined
      }
      aria-label={
        assignment
          ? `${label} : ${assignment.player.name}, ${RARITIES[assignment.rarity].name}. Modifier`
          : `Ajouter un personnage : ${label}`
      }
      data-dragging={dragging}
      onClick={onClick}
      title={assignment ? `${assignment.player.name} - ${RARITIES[assignment.rarity].name}` : label}
    >
      {assignment ? (
        <PlayerCard assignment={assignment} />
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
