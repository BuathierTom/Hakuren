
CREATE TABLE data_sources (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  url VARCHAR(1024) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE source_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source_id INT UNSIGNED NOT NULL,
  entity_kind VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  external_key VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  source_version VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_url VARCHAR(1024) NULL,
  retrieved_at DATETIME(3) NOT NULL,
  payload JSON NOT NULL,
  sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  review_status ENUM('pending', 'verified', 'quarantined') NOT NULL DEFAULT 'pending',
  review_note TEXT NULL,
  UNIQUE KEY uq_source_record (source_id, entity_kind, external_key, source_version),
  KEY idx_source_review (review_status, entity_kind),
  CONSTRAINT fk_record_source FOREIGN KEY (source_id) REFERENCES data_sources(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE works (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  name VARCHAR(191) NOT NULL,
  kind ENUM('game', 'anime') NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  source_record_id INT UNSIGNED NULL,
  CONSTRAINT fk_work_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE characters (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  name VARCHAR(191) NOT NULL,
  source_record_id INT UNSIGNED NULL,
  CONSTRAINT fk_character_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE character_names (
  character_id INT UNSIGNED NOT NULL,
  locale VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(191) NOT NULL,
  is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
  source_record_id INT UNSIGNED NULL,
  PRIMARY KEY (character_id, locale, name),
  KEY idx_character_name (name),
  CONSTRAINT ck_character_name_preferred CHECK (is_preferred IN (0, 1)),
  CONSTRAINT fk_character_name_character FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  CONSTRAINT fk_character_name_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE player_variants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  character_id INT UNSIGNED NULL,
  name VARCHAR(191) NOT NULL,
  variant_label VARCHAR(191) NULL,
  origin_work_id INT UNSIGNED NULL,
  element ENUM('wind', 'forest', 'fire', 'mountain', 'void') NULL,
  position ENUM('GK', 'DF', 'MF', 'FW') NULL,
  role VARCHAR(32) NULL,
  gender ENUM('male', 'female', 'neutral') NULL,
  age_group VARCHAR(32) NULL,
  school_year VARCHAR(32) NULL,
  portrait_url VARCHAR(1024) NULL,
  source_record_id INT UNSIGNED NULL,
  KEY idx_variant_name (name),
  KEY idx_variant_filters (position, element, id),
  KEY idx_variant_origin (origin_work_id, id),
  CONSTRAINT fk_variant_character FOREIGN KEY (character_id) REFERENCES characters(id),
  CONSTRAINT fk_variant_origin FOREIGN KEY (origin_work_id) REFERENCES works(id),
  CONSTRAINT fk_variant_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE variant_components (
  variant_id INT UNSIGNED NOT NULL,
  character_id INT UNSIGNED NOT NULL,
  role ENUM('base', 'donor') NOT NULL,
  source_record_id INT UNSIGNED NULL,
  PRIMARY KEY (variant_id, character_id, role),
  CONSTRAINT fk_component_variant FOREIGN KEY (variant_id) REFERENCES player_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_component_character FOREIGN KEY (character_id) REFERENCES characters(id),
  CONSTRAINT fk_component_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE variant_external_ids (
  source_id INT UNSIGNED NOT NULL,
  external_key VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  variant_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (source_id, external_key),
  CONSTRAINT fk_variant_external_source FOREIGN KEY (source_id) REFERENCES data_sources(id),
  CONSTRAINT fk_variant_external_variant FOREIGN KEY (variant_id) REFERENCES player_variants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE variant_source_links (
  variant_id INT UNSIGNED NOT NULL,
  source_record_id INT UNSIGNED NOT NULL,
  scope ENUM('identity', 'techniques', 'acquisition') NOT NULL,
  match_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  PRIMARY KEY (variant_id, source_record_id, scope),
  KEY idx_variant_match (match_status, scope),
  CONSTRAINT fk_variant_link_variant FOREIGN KEY (variant_id) REFERENCES player_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_variant_link_record FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE variant_appearances (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  variant_id INT UNSIGNED NOT NULL,
  work_id INT UNSIGNED NOT NULL,
  source_record_id INT UNSIGNED NULL,
  UNIQUE KEY uq_variant_appearance (variant_id, work_id),
  KEY idx_appearance_work (work_id, variant_id),
  CONSTRAINT fk_appearance_variant FOREIGN KEY (variant_id) REFERENCES player_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_appearance_work FOREIGN KEY (work_id) REFERENCES works(id),
  CONSTRAINT fk_appearance_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE historical_teams (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  name VARCHAR(191) NOT NULL,
  source_record_id INT UNSIGNED NULL,
  CONSTRAINT fk_historical_team_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE appearance_teams (
  appearance_id INT UNSIGNED NOT NULL,
  historical_team_id INT UNSIGNED NOT NULL,
  source_record_id INT UNSIGNED NULL,
  PRIMARY KEY (appearance_id, historical_team_id),
  KEY idx_appearance_team (historical_team_id, appearance_id),
  CONSTRAINT fk_membership_appearance FOREIGN KEY (appearance_id) REFERENCES variant_appearances(id) ON DELETE CASCADE,
  CONSTRAINT fk_membership_team FOREIGN KEY (historical_team_id) REFERENCES historical_teams(id),
  CONSTRAINT fk_membership_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rarities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE variant_rarities (
  variant_id INT UNSIGNED NOT NULL,
  rarity_id INT UNSIGNED NOT NULL,
  source_record_id INT UNSIGNED NULL,
  PRIMARY KEY (variant_id, rarity_id),
  CONSTRAINT fk_variant_rarity_variant FOREIGN KEY (variant_id) REFERENCES player_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_variant_rarity_rarity FOREIGN KEY (rarity_id) REFERENCES rarities(id),
  CONSTRAINT fk_variant_rarity_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE game_contexts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  work_id INT UNSIGNED NOT NULL,
  mode_code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  game_version VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  UNIQUE KEY uq_game_context (work_id, mode_code, game_version),
  CONSTRAINT fk_context_work FOREIGN KEY (work_id) REFERENCES works(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE player_stat_profiles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  variant_id INT UNSIGNED NOT NULL,
  context_id INT UNSIGNED NOT NULL,
  profile_key VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  rarity_id INT UNSIGNED NULL,
  level SMALLINT UNSIGNED NULL,
  power SMALLINT UNSIGNED NULL,
  control SMALLINT UNSIGNED NULL,
  technique SMALLINT UNSIGNED NULL,
  pressure SMALLINT UNSIGNED NULL,
  physical SMALLINT UNSIGNED NULL,
  agility SMALLINT UNSIGNED NULL,
  intelligence SMALLINT UNSIGNED NULL,
  source_record_id INT UNSIGNED NULL,
  UNIQUE KEY uq_player_profile (variant_id, context_id, profile_key),
  CONSTRAINT ck_player_stat_level CHECK (level IS NULL OR level > 0),
  CONSTRAINT fk_stat_variant FOREIGN KEY (variant_id) REFERENCES player_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_stat_context FOREIGN KEY (context_id) REFERENCES game_contexts(id),
  CONSTRAINT fk_stat_rarity FOREIGN KEY (rarity_id) REFERENCES rarities(id),
  CONSTRAINT fk_stat_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE techniques (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  game_id VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL UNIQUE,
  string_id VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NULL,
  kind ENUM('hissatsu', 'aura_hissatsu', 'aura') NULL,
  description TEXT NULL,
  power SMALLINT UNSIGNED NULL,
  tension SMALLINT UNSIGNED NULL,
  cooldown SMALLINT UNSIGNED NULL,
  notes JSON NULL,
  granted_game_id VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  slug VARCHAR(120) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  name VARCHAR(191) NOT NULL,
  category ENUM('shoot', 'dribble', 'block', 'catch', 'keshin', 'keshin_armed', 'miximax', 'totem', 'bond_transform', 'awakening_power', 'mode_change', 'awakening_change', 'tactic', 'passive', 'other') NULL,
  element ENUM('wind', 'forest', 'fire', 'mountain', 'void') NULL,
  preview_url VARCHAR(1024) NULL,
  preview_mime_type VARCHAR(96) NULL,
  source_record_id INT UNSIGNED NULL,
  KEY idx_technique_name (name),
  KEY idx_technique_filters (category, element, id),
  CONSTRAINT fk_technique_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE technique_names (
  technique_id INT UNSIGNED NOT NULL,
  locale VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(191) NOT NULL,
  is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
  source_record_id INT UNSIGNED NULL,
  PRIMARY KEY (technique_id, locale, name),
  KEY idx_technique_alias (name),
  CONSTRAINT ck_technique_name_preferred CHECK (is_preferred IN (0, 1)),
  CONSTRAINT fk_technique_name_technique FOREIGN KEY (technique_id) REFERENCES techniques(id) ON DELETE CASCADE,
  CONSTRAINT fk_technique_name_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE technique_external_ids (
  source_id INT UNSIGNED NOT NULL,
  external_key VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  technique_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (source_id, external_key),
  CONSTRAINT fk_technique_external_source FOREIGN KEY (source_id) REFERENCES data_sources(id),
  CONSTRAINT fk_technique_external_technique FOREIGN KEY (technique_id) REFERENCES techniques(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE technique_stat_profiles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  technique_id INT UNSIGNED NOT NULL,
  context_id INT UNSIGNED NOT NULL,
  profile_key VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  rarity_id INT UNSIGNED NULL,
  power SMALLINT UNSIGNED NULL,
  cost SMALLINT UNSIGNED NULL,
  parameters JSON NULL,
  source_record_id INT UNSIGNED NULL,
  UNIQUE KEY uq_technique_profile (technique_id, context_id, profile_key),
  CONSTRAINT fk_technique_stat_technique FOREIGN KEY (technique_id) REFERENCES techniques(id) ON DELETE CASCADE,
  CONSTRAINT fk_technique_stat_context FOREIGN KEY (context_id) REFERENCES game_contexts(id),
  CONSTRAINT fk_technique_stat_rarity FOREIGN KEY (rarity_id) REFERENCES rarities(id),
  CONSTRAINT fk_technique_stat_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE variant_learnsets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  variant_id INT UNSIGNED NOT NULL,
  technique_id INT UNSIGNED NOT NULL,
  context_id INT UNSIGNED NOT NULL,
  source_record_id INT UNSIGNED NOT NULL,
  source_entry_key VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_section VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  unlock_level SMALLINT UNSIGNED NULL,
  alternate_path BOOLEAN NULL,
  basara_only BOOLEAN NULL,
  rarity_scope ENUM('unknown', 'unrestricted', 'restricted') NOT NULL DEFAULT 'unknown',
  source_flags JSON NULL,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_learnset_variant (id, variant_id),
  UNIQUE KEY uq_learnset_entry (variant_id, source_record_id, source_entry_key),
  KEY idx_learnset_lookup (variant_id, context_id, is_current),
  KEY idx_technique_users (technique_id, context_id, variant_id),
  CONSTRAINT ck_learnset_level CHECK (unlock_level IS NULL OR unlock_level > 0),
  CONSTRAINT ck_learnset_path CHECK (alternate_path IS NULL OR alternate_path IN (0, 1)),
  CONSTRAINT ck_learnset_basara CHECK (basara_only IS NULL OR basara_only IN (0, 1)),
  CONSTRAINT ck_learnset_current CHECK (is_current IN (0, 1)),
  CONSTRAINT fk_learnset_variant FOREIGN KEY (variant_id) REFERENCES player_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_learnset_technique FOREIGN KEY (technique_id) REFERENCES techniques(id),
  CONSTRAINT fk_learnset_context FOREIGN KEY (context_id) REFERENCES game_contexts(id),
  CONSTRAINT fk_learnset_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE learnset_rarities (
  learnset_id INT UNSIGNED NOT NULL,
  rarity_id INT UNSIGNED NOT NULL,
  source_record_id INT UNSIGNED NULL,
  PRIMARY KEY (learnset_id, rarity_id),
  CONSTRAINT fk_learnset_rarity_learnset FOREIGN KEY (learnset_id) REFERENCES variant_learnsets(id) ON DELETE CASCADE,
  CONSTRAINT fk_learnset_rarity_rarity FOREIGN KEY (rarity_id) REFERENCES rarities(id),
  CONSTRAINT fk_learnset_rarity_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  discord_id VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  avatar_url VARCHAR(1024) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_collection (
  user_id INT UNSIGNED NOT NULL,
  variant_id INT UNSIGNED NOT NULL,
  is_owned BOOLEAN NOT NULL DEFAULT FALSE,
  is_wishlisted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, variant_id),
  CONSTRAINT ck_collection_owned CHECK (is_owned IN (0, 1)),
  CONSTRAINT ck_collection_wishlist CHECK (is_wishlisted IN (0, 1)),
  CONSTRAINT ck_collection_tracked CHECK (is_owned = 1 OR is_wishlisted = 1),
  CONSTRAINT fk_collection_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_collection_variant FOREIGN KEY (variant_id) REFERENCES player_variants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE formations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE formation_positions (
  formation_id INT UNSIGNED NOT NULL,
  slot_number TINYINT UNSIGNED NOT NULL,
  position ENUM('GK', 'DF', 'MF', 'FW') NOT NULL,
  x DECIMAL(5, 2) NOT NULL,
  y DECIMAL(5, 2) NOT NULL,
  PRIMARY KEY (formation_id, slot_number),
  CONSTRAINT ck_formation_slot CHECK (slot_number BETWEEN 1 AND 11),
  CONSTRAINT ck_formation_coordinates CHECK (x BETWEEN 0 AND 100 AND y BETWEEN 0 AND 100),
  CONSTRAINT fk_formation_position FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE squads (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  formation_id INT UNSIGNED NULL,
  context_id INT UNSIGNED NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_squad_owner (user_id, updated_at, id),
  CONSTRAINT fk_squad_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_squad_formation FOREIGN KEY (formation_id) REFERENCES formations(id),
  CONSTRAINT fk_squad_context FOREIGN KEY (context_id) REFERENCES game_contexts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE squad_players (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  squad_id INT UNSIGNED NOT NULL,
  variant_id INT UNSIGNED NOT NULL,
  rarity_id INT UNSIGNED NOT NULL,
  slot_kind ENUM('starter', 'substitute') NOT NULL,
  slot_number TINYINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_squad_slot (squad_id, slot_kind, slot_number),
  UNIQUE KEY uq_squad_variant (squad_id, variant_id),
  UNIQUE KEY uq_squad_player_variant (id, variant_id),
  CONSTRAINT ck_squad_player_slot CHECK (slot_number > 0 AND (slot_kind <> 'starter' OR slot_number <= 11)),
  CONSTRAINT fk_squad_player_squad FOREIGN KEY (squad_id) REFERENCES squads(id) ON DELETE CASCADE,
  CONSTRAINT fk_squad_player_availability FOREIGN KEY (variant_id, rarity_id) REFERENCES variant_rarities(variant_id, rarity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE squad_player_techniques (
  squad_player_id INT UNSIGNED NOT NULL,
  variant_id INT UNSIGNED NOT NULL,
  slot_number TINYINT UNSIGNED NOT NULL,
  learnset_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (squad_player_id, slot_number),
  UNIQUE KEY uq_squad_player_technique (squad_player_id, learnset_id),
  CONSTRAINT ck_squad_technique_slot CHECK (slot_number > 0),
  CONSTRAINT fk_squad_technique_player FOREIGN KEY (squad_player_id, variant_id) REFERENCES squad_players(id, variant_id) ON DELETE CASCADE,
  CONSTRAINT fk_squad_technique_learnset FOREIGN KEY (learnset_id, variant_id) REFERENCES variant_learnsets(id, variant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE squad_staff (
  squad_id INT UNSIGNED NOT NULL,
  variant_id INT UNSIGNED NOT NULL,
  role ENUM('coach', 'manager') NOT NULL,
  slot_number TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (squad_id, role, slot_number),
  UNIQUE KEY uq_squad_staff_variant (squad_id, variant_id),
  CONSTRAINT ck_squad_staff_slot CHECK (slot_number > 0),
  CONSTRAINT fk_squad_staff_squad FOREIGN KEY (squad_id) REFERENCES squads(id) ON DELETE CASCADE,
  CONSTRAINT fk_squad_staff_variant FOREIGN KEY (variant_id) REFERENCES player_variants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
