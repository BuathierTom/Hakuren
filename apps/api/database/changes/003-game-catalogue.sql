ALTER TABLE techniques
  MODIFY COLUMN category ENUM('shoot', 'dribble', 'block', 'catch', 'keshin', 'keshin_armed', 'miximax', 'totem', 'bond_transform', 'awakening_power', 'mode_change', 'awakening_change', 'tactic', 'passive', 'other') NULL,
  ADD COLUMN game_id VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL UNIQUE,
  ADD COLUMN string_id VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD COLUMN kind ENUM('hissatsu', 'aura_hissatsu', 'aura') NULL,
  ADD COLUMN description TEXT NULL,
  ADD COLUMN power SMALLINT UNSIGNED NULL,
  ADD COLUMN tension SMALLINT UNSIGNED NULL,
  ADD COLUMN cooldown SMALLINT UNSIGNED NULL,
  ADD COLUMN notes JSON NULL,
  ADD COLUMN granted_game_id VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE catalogue_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  section ENUM('equipment', 'tactics') NOT NULL,
  game_id VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  string_id VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(191) NOT NULL,
  description TEXT NULL,
  slot ENUM('boots', 'bracelet', 'pendant', 'accessory') NULL,
  image_url VARCHAR(1024) NULL,
  tension DECIMAL(10,4) UNSIGNED NULL,
  stats JSON NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  source_record_id INT UNSIGNED NULL,
  UNIQUE KEY uq_catalogue_item (section, string_id),
  KEY idx_catalogue_item_list (section, is_published, slot, id),
  CONSTRAINT fk_catalogue_item_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
