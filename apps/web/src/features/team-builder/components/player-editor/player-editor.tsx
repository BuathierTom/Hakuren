import { catalogueName } from '@/features/catalogue/lib/catalogue-text';
import { t } from '@/features/preferences/lib/i18n';
import { FavoriteButton } from '@/features/favorites/components/favorite-button/favorite-button';
import { PlayerNotes } from '../player-notes/player-notes';
import { playerNote } from '../../lib/player-notes';
import { PlayerLoadout } from '../player-loadout/player-loadout';
import { useId } from 'react';
import type { PlayStyle, PlayerDetail } from '@shared/catalogue';
import { Select } from '@/components/ui/select/select';
import { PlayStyleIcon } from '@/features/catalogue/components/game-icon/game-icon';
import { PlayerProfileHeader } from '@/features/catalogue/components/player-details/player-profile-header';
import { PlayerStats } from '@/features/catalogue/components/player-stats/player-stats';
import { PlayerTechniques } from '@/features/catalogue/components/player-techniques/player-techniques';
import { useRequest } from '@/features/catalogue/hooks/use-catalogue-request';
import { playerMoves } from '@/features/catalogue/lib/player-forms';
import { PLAY_STYLES } from '@/features/catalogue/lib/labels';
import { TeamDialog } from '../team-dialog/team-dialog';
import {
  RARITIES,
  putPlayer,
  assignmentStats,
  snapshotPlayer,
  type Assignment,
  type Team,
  type TeamRarity,
} from '../../lib/team';
import { rarityAppearance } from '../../lib/rarity-appearance';
import { Icon } from '@/components/ui/icon/icon';
import styles from './player-editor.module.scss';
interface Props {
  team: Team;
  slot: string;
  onChange: (assignment: Assignment) => void;
  onNoteChange: (playerId: number, note: string) => void;
  onRemove: () => void;
  onReplace: () => void;
  onClose: () => void;
}
export function PlayerEditor({
  team,
  slot,
  onChange,
  onNoteChange,
  onRemove,
  onReplace,
  onClose,
}: Props) {
  const assignment = team.slots[slot]!;
  const request = useRequest<PlayerDetail>(`/api/players/${assignment.player.id}`);
  const titleId = useId();
  const player = request.data;
  const current: Assignment = {
    ...assignment,
    player: player ? snapshotPlayer(player) : assignment.player,
  };
  const playStyle = current.playStyle ?? current.player.playStyle;
  const stats = assignmentStats(current);
  const form =
    assignment.rarity === 'hero' || assignment.rarity === 'basara' ? assignment.rarity : 'common';
  const moves = player ? playerMoves(player, form) : [];
  const ceiling =
    Math.ceil(
      Math.max(
        300,
        ...current.player.profiles.flatMap((profile) =>
          Object.values(profile.values).map(
            (value) => (value ?? 0) * (profile.rarity === 'common' ? RARITIES.legendary.scale : 1),
          ),
        ),
      ) / 50,
    ) * 50;
  const controls = (
    <div className={styles.controls}>
      <Select
        label={t('Rareté')}
        showLabel
        value={assignment.rarity}
        onChange={(rarity) => onChange({ ...current, rarity: rarity as TeamRarity })}
        options={Object.entries(RARITIES)
          .filter(([rarity]) => current.player.rarities.includes(rarity as TeamRarity))
          .map(([value, info]) => {
            let reason = '';
            try {
              putPlayer(team, slot, { ...current, rarity: value as TeamRarity });
            } catch (error) {
              reason = error instanceof Error ? error.message : t('Rareté indisponible');
            }
            return {
              value,
              label: t(info.name),
              icon: (
                <span
                  className={styles.rarityColor}
                  style={{ background: rarityAppearance(value as TeamRarity, playStyle).color }}
                />
              ),
              disabled: !!reason,
              description: reason || undefined,
            };
          })}
      />
      <Select
        label={t('Archétype')}
        showLabel
        value={playStyle ?? ''}
        placeholder={t('Choisir un archétype')}
        onChange={(value) => onChange({ ...current, playStyle: value as PlayStyle })}
        options={Object.entries(PLAY_STYLES).map(([value, label]) => ({
          value,
          label: t(label),
          icon: <PlayStyleIcon style={value as PlayStyle} />,
        }))}
      />
    </div>
  );
  return (
    <TeamDialog
      title={t('Fiche joueur')}
      onClose={onClose}
      wide
      actions={
        <>
          <FavoriteButton
            kind="players"
            targetId={assignment.player.id}
            name={catalogueName(assignment.player)}
          />
          <button type="button" className={styles.change} onClick={onReplace}>
            {t('Changer')}
          </button>
          <button
            type="button"
            className={styles.remove}
            onClick={onRemove}
            aria-label={t('Retirer le joueur de l’équipe')}
            title={t('Retirer de l’équipe')}
          >
            <Icon name="trash" size={18} />
          </button>
        </>
      }
    >
      {request.loading ? (
        <div className={styles.state} role="status">
          {t('Chargement de la fiche de')} {catalogueName(assignment.player)}…
        </div>
      ) : player ? (
        <>
          <PlayerProfileHeader
            player={player}
            titleId={titleId}
            playStyle={playStyle}
            aside={controls}
          />
          <hr className={styles.separator} />
          <div className={styles.panels} aria-live="polite">
            <PlayerStats stats={stats} ceiling={ceiling} />
            <PlayerTechniques key={`${assignment.player.id}-${form}`} moves={moves} />
          </div>
          <PlayerLoadout assignment={current} slot={slot} onChange={onChange} />
        </>
      ) : (
        <div className={styles.state} role="alert">
          <h3>{catalogueName(assignment.player)}</h3>
          <p>{request.error?.message ?? t('Cette fiche est indisponible.')}</p>
          <button type="button" onClick={request.retry}>
            {t('Réessayer')}
          </button>
        </div>
      )}
      <PlayerNotes
        value={playerNote(team, assignment.player.id)}
        onChange={(note) => onNoteChange(assignment.player.id, note)}
      />
    </TeamDialog>
  );
}
