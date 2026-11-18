import type { Element, Position } from '@shared/catalogue';
import { ElementIcon } from '../game-icon/game-icon';
import { ELEMENTS, POSITIONS } from '../../lib/labels';
import styles from './catalogue-badges.module.scss';

export function ElementBadge({
  element,
  compact = false,
}: {
  element: Element | null;
  compact?: boolean;
}) {
  if (!element) return null;
  return (
    <span
      className={`${styles.element} ${compact ? styles.compact : ''}`}
      data-element={element ?? 'unknown'}
      title={ELEMENTS[element]}
    >
      <ElementIcon element={element} />
      {!compact && <span>{ELEMENTS[element]}</span>}
    </span>
  );
}
export function PositionBadge({ position }: { position: Position | null }) {
  return (
    <span
      className={styles.position}
      data-position={position ?? 'unknown'}
      title={position ? POSITIONS[position] : 'Poste non renseigné'}
    >
      {position ?? '—'}
    </span>
  );
}
export function RarityBadge({ name }: { name: string }) {
  return (
    <span className={styles.rarity} data-rarity={name.toLowerCase()}>
      {name}
    </span>
  );
}
