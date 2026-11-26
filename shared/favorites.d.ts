export type FavoriteKind = 'players' | 'techniques' | 'equipment' | 'tactics' | 'teams';
export interface FavoritePlaylist {
  id: string;
  name: string;
  isDefault: boolean;
}
export interface FavoriteRef {
  playlistId: string;
  kind: FavoriteKind;
  targetId: number;
}
export interface FavoritesState {
  playlists: FavoritePlaylist[];
  entries: FavoriteRef[];
}
export interface FavoriteEntry {
  kind: FavoriteKind;
  targetId: number;
  name: string;
  imageUrl: string | null;
  available: boolean;
}
