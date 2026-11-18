import type { PlayerDetail, PlayerForm, PlayerStats } from '@shared/catalogue';

export const PLAYER_FORMS: Record<PlayerForm, string> = {
  common: 'Commun',
  hero: 'HERO',
  basara: 'BASARA',
};

export function playerForms(player: PlayerDetail): PlayerForm[] {
  return (['common', 'hero', 'basara'] as const).filter(
    (rarity) => rarity === 'common' || player.rarities.some((entry) => entry.code === rarity),
  );
}

export function playerStats(player: PlayerDetail, rarity: PlayerForm): PlayerStats | null {
  return (
    [...player.statProfiles]
      .filter((profile) => profile.rarity === rarity)
      .sort((a, b) => (b.level ?? 0) - (a.level ?? 0))[0] ??
    (rarity === 'common' ? player.statistics : null)
  );
}

export function playerMoves(player: PlayerDetail, rarity: PlayerForm) {
  return player.learnsets
    .filter(
      (move) =>
        move.work.code === 'VR' &&
        move.mode === 'standard' &&
        (move.rarityScope === 'unrestricted' ||
          move.rarities.some((entry) => entry.code === rarity) ||
          (rarity === 'common' && move.rarities.length === 0 && move.basaraOnly !== true)),
    )
    .sort((a, b) => (a.level ?? Infinity) - (b.level ?? Infinity) || a.id - b.id);
}
