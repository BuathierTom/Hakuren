import type { FavoriteKind } from '@shared/favorites';
export const FAVORITE_KINDS: Record<FavoriteKind, string> = {
  players: 'Joueurs',
  techniques: 'Techniques',
  equipment: 'Équipements',
  tactics: 'Tactiques',
  teams: 'Équipes',
};
export function favoriteKind(value: string | null | undefined): value is FavoriteKind {
  return !!value && Object.hasOwn(FAVORITE_KINDS, value);
}
