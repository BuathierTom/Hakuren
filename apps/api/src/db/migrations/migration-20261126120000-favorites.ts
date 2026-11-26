import { Migration } from '@mikro-orm/migrations';

export class Migration20261126120000_favorites extends Migration {
  override up(): void {
    this.addSql(`CREATE TABLE IF NOT EXISTS favorite_playlists (
      id VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      name VARCHAR(80) NOT NULL,
      is_default BOOLEAN NOT NULL,
      created_at DATETIME(3) NOT NULL,
      UNIQUE KEY uq_favorite_playlist_name (user_id, name),
      CONSTRAINT fk_favorite_playlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS favorite_entries (
      playlist_id VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      kind VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      target_id INT UNSIGNED NOT NULL,
      created_at DATETIME(3) NOT NULL,
      PRIMARY KEY (playlist_id, kind, target_id),
      KEY idx_favorite_entries_order (playlist_id, kind, created_at, target_id),
      CONSTRAINT fk_favorite_entry_playlist FOREIGN KEY (playlist_id) REFERENCES favorite_playlists(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  override down(): void {
    this.addSql('DROP TABLE IF EXISTS favorite_entries');
    this.addSql('DROP TABLE IF EXISTS favorite_playlists');
  }
}
