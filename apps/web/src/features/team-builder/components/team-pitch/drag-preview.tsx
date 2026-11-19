import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import type { DragPreview as Preview } from '../../hooks/use-player-drag';
import { RARITIES, type Assignment } from '../../lib/team';
import { PlayerCard } from './player-card';
import styles from './team-pitch.module.scss';
export function DragPreview({ preview, assignment }: { preview: Preview; assignment: Assignment }) {
  return createPortal(
    <div
      className={styles.dragPreview}
      aria-hidden="true"
      style={{ left: preview.x, top: preview.y, width: preview.width, height: preview.height }}
    >
      <div
        className={`${styles.slot} ${preview.height <= 44 ? styles.compactCard : ''}`}
        data-filled="true"
        data-rarity={assignment.rarity}
        style={{ '--rarity': RARITIES[assignment.rarity].color } as CSSProperties}
      >
        <PlayerCard assignment={assignment} />
      </div>
    </div>,
    document.body,
  );
}
