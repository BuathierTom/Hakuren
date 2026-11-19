import type { Assignment } from '../../lib/team';
import { playerSurname } from '../../lib/player-name';
import { ElementIcon, PositionIcon } from '@/features/catalogue/components/game-icon/game-icon';
import { Portrait } from '@/features/catalogue/components/player-portrait/player-portrait';
import styles from './team-pitch.module.scss';
export function PlayerCard({ assignment }: { assignment: Assignment }) {
  return (
    <span className={styles.slotInner}>
      <span className={styles.playerInfo}>
        <ElementIcon element={assignment.player.element} />
        {assignment.player.position && <PositionIcon position={assignment.player.position} />}
        <strong>{playerSurname(assignment.player.name)}</strong>
      </span>
      <span className={styles.portrait}>
        <Portrait small src={assignment.player.portraitUrl} />
      </span>
    </span>
  );
}
