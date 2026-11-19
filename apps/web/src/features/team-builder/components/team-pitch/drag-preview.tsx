import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import type { DragPreview as Preview } from '../../hooks/use-player-drag';
import { type Assignment } from '../../lib/team';
import { PlayerCard } from './player-card';
import { assignmentAppearance } from '../../lib/rarity-appearance';
import styles from './team-pitch.module.scss';
export function DragPreview({
  preview,
  assignment,
  warning,
}: {
  preview: Preview;
  assignment: Assignment;
  warning: string | null;
}) {
  const appearance = assignmentAppearance(assignment);
  return createPortal(
    <div
      className={styles.dragPreview}
      aria-hidden="true"
      style={{ left: preview.x, top: preview.y, width: preview.width, height: preview.height }}
    >
      <div
        className={`${styles.slot} ${preview.height < 60 ? styles.compactCard : ''}`}
        data-filled="true"
        data-rarity={assignment.rarity}
        style={
          { '--rarity': appearance.color, '--rarity-shadow': appearance.shadow } as CSSProperties
        }
      >
        <PlayerCard assignment={assignment} warning={warning} />
      </div>
    </div>,
    document.body,
  );
}
