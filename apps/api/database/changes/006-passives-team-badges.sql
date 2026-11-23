CREATE TABLE IF NOT EXISTS catalogue_passives (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  game_id VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  string_id VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  source ENUM('player', 'custom', 'coach', 'manager') NOT NULL,
  play_style ENUM('breach', 'tension', 'counter', 'bond', 'rough_play', 'justice') NULL,
  value DECIMAL(10,4) NOT NULL,
  unit ENUM('percent', 'points') NOT NULL,
  icon SMALLINT UNSIGNED NULL,
  family INT UNSIGNED NULL,
  tier TINYINT UNSIGNED NULL,
  source_url VARCHAR(1024) NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  KEY idx_passive_list (is_published, source, play_style, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS team_badges (
  historical_team_id INT UNSIGNED PRIMARY KEY,
  image_url VARCHAR(1024) NOT NULL,
  source_url VARCHAR(1024) NOT NULL,
  CONSTRAINT fk_team_badge_team FOREIGN KEY (historical_team_id) REFERENCES historical_teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
