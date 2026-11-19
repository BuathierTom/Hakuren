import type { Formation } from '@shared/formations';
import { Portrait } from '@/features/catalogue/components/player-portrait/player-portrait';
import { TeamDialog } from '../team-dialog/team-dialog';
import { RARITIES, putPlayer, slotLabel, type Team, type TeamRarity } from '../../lib/team';
import styles from './player-editor.module.scss';
interface Props {
  team: Team;
  slot: string;
  formation: Formation;
  onRarity: (rarity: TeamRarity) => void;
  onRemove: () => void;
  onReplace: () => void;
  onClose: () => void;
  notice: string;
}
export function PlayerEditor({
  team,
  slot,
  formation,
  onRarity,
  onRemove,
  onReplace,
  onClose,
  notice,
}: Props) {
  const assignment = team.slots[slot]!;
  return (
    <TeamDialog title="Modifier le personnage" onClose={onClose}>
      <div className={styles.identity}>
        <Portrait src={assignment.player.portraitUrl} small />
        <div>
          <h3>{assignment.player.name}</h3>
          <p>{slotLabel(slot, formation)}</p>
        </div>
      </div>
      <fieldset className={styles.rarities}>
        <legend>Rareté</legend>
        {Object.entries(RARITIES)
          .filter(([rarity]) => assignment.player.rarities.includes(rarity as TeamRarity))
          .map(([rarity, info]) => {
            let reason = '';
            try {
              putPlayer(team, slot, { ...assignment, rarity: rarity as TeamRarity });
            } catch (error) {
              reason = error instanceof Error ? error.message : 'Rareté indisponible';
            }
            return (
              <label
                key={rarity}
                data-disabled={!!reason}
                style={{ borderLeftColor: info.color }}
                title={reason || info.name}
              >
                <input
                  type="radio"
                  name="player-rarity"
                  checked={assignment.rarity === rarity}
                  disabled={!!reason}
                  onChange={() => onRarity(rarity as TeamRarity)}
                />
                <span>{info.name}</span>
              </label>
            );
          })}
      </fieldset>
      {notice && (
        <p className={styles.error} role="alert">
          {notice}
        </p>
      )}
      <div className={styles.actions}>
        <button type="button" onClick={onReplace}>
          Remplacer
        </button>
        <button type="button" className={styles.remove} onClick={onRemove}>
          Retirer de l’équipe
        </button>
      </div>
    </TeamDialog>
  );
}
