CREATE TABLE IF NOT EXISTS user_teams (
  user_id INT UNSIGNED NOT NULL,
  team_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload JSON NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (user_id, team_id),
  KEY idx_user_team_updated (user_id, updated_at),
  CONSTRAINT fk_user_team_owner FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_team_drafts (
  user_id INT UNSIGNED PRIMARY KEY,
  payload JSON NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_user_team_draft_owner FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
