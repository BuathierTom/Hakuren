import { usePreferences } from '@/features/preferences/use-preferences';
import { t } from '@/features/preferences/lib/i18n';
import { useEffect, useRef, useState, useMemo, type CSSProperties } from 'react';
import type { Formation } from '@shared/formations';
import { BENCH_SLOTS, STAFF_SLOTS, slotLabel, type Team } from '../../lib/team';
import { pitchGeometry } from '../../lib/pitch-layout';
import { teamAlerts, playerWarning } from '../../lib/team-alerts';
import { PlayerSlot } from './player-slot';
import { DragPreview } from './drag-preview';
import { usePlayerDrag } from '../../hooks/use-player-drag';
import styles from './team-pitch.module.scss';
interface Props {
  team: Team;
  formation: Formation;
  onSlot: (slot: string) => void;
  onMove: (from: string, to: string) => void;
}
export function TeamPitch({ team, formation, onSlot, onMove }: Props) {
  const { language } = usePreferences();
  const board = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(850);
  const { preview, over, dragging, handlers } = usePlayerDrag(team, onMove);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(board.current!);
    return () => observer.disconnect();
  }, []);
  const alerts = useMemo(() => teamAlerts(team, formation), [team, formation, language]);
  const geometry = pitchGeometry(formation.positions, width);
  const tile = (slot: string, position?: Formation['positions'][number]['position']) => (
    <PlayerSlot
      slot={slot}
      position={position}
      label={slotLabel(slot, formation)}
      assignment={team.slots[slot]}
      warning={playerWarning(alerts, slot)}
      dragging={dragging === slot}
      onClick={() => onSlot(slot)}
    />
  );
  return (
    <div
      className={styles.composition}
      data-over={over}
      style={
        {
          '--tile-width': `${geometry.cardWidth}px`,
          '--tile-height': `${geometry.cardHeight}px`,
          '--pitch-height': `${geometry.boardHeight}px`,
          '--roster-width': `${width < 500 ? Math.max(72, geometry.cardWidth) : geometry.cardWidth}px`,
          '--roster-height': width < 500 ? '56px' : '60px',
        } as CSSProperties
      }
      {...handlers}
    >
      {preview && team.slots[preview.slot] && (
        <DragPreview
          preview={preview}
          assignment={team.slots[preview.slot]!}
          warning={playerWarning(alerts, preview.slot)}
        />
      )}
      <section className={styles.pitch} aria-label={t('Terrain de l’équipe')}>
        <header className={styles.sectionHeader}>
          <h2>{t(formation.name)}</h2>
          <span>
            {dragging
              ? t('Relâcher pour déplacer ou permuter')
              : t('Glisser pour déplacer - déposer pour permuter')}
          </span>
        </header>
        <div ref={board} className={styles.board}>
          <div className={styles.playable}>
            {geometry.positions.map((position) => (
              <div
                key={position.slot}
                className={styles.fieldSlot}
                data-target={over === `field-${position.slot}`}
                style={{ left: `${position.x}%`, top: `${100 - position.y}%` }}
              >
                {tile(`field-${position.slot}`, position.position)}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className={styles.roster} aria-label={t('Remplaçants et staff')}>
        <header className={styles.sectionHeader}>
          <h2>{t('Effectif')}</h2>
        </header>
        <div className={styles.rosterBody}>
          <div className={styles.rosterRow}>
            <h3>{t('Remplaçants')}</h3>
            <div className={styles.bench}>
              {BENCH_SLOTS.map((slot) => (
                <div key={slot} data-target={over === slot}>
                  {tile(slot)}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.rosterRow}>
            <h3>Staff</h3>
            <div className={styles.staff}>
              {STAFF_SLOTS.map((slot) => (
                <div key={slot} data-target={over === slot}>
                  {tile(slot)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
