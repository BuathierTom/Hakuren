import { PlayerDetailBlock } from '@/features/catalogue/components/player-detail-block/player-detail-block';
import { PLAYER_NOTE_LIMIT } from '../../lib/player-notes';
import styles from './player-notes.module.scss';

export function PlayerNotes({
  value,
  onChange,
}: {
  value: string;
  onChange: (note: string) => void;
}) {
  return (
    <div className={styles.notes}>
      <PlayerDetailBlock title="Notes">
        <textarea
          aria-label="Notes du joueur pour cette équipe"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={PLAYER_NOTE_LIMIT}
          rows={5}
          placeholder="Ajoute tes consignes, tes idées ou tes remarques…"
          className={styles.textarea}
        />
      </PlayerDetailBlock>
    </div>
  );
}
