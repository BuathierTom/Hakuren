import { Migration } from '@mikro-orm/migrations';

export class Migration20261124104546_initial extends Migration {
  override name = 'Migration20261124104546_initial';

  override up(): void {
    this.addSql(`CREATE TABLE IF NOT EXISTS data_sources (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  url VARCHAR(1024) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS source_records (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS works (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  name VARCHAR(191) NOT NULL,
  kind ENUM('game', 'anime') NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  source_record_id INT UNSIGNED NULL,
  CONSTRAINT fk_work_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS characters (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  name VARCHAR(191) NOT NULL,
  source_record_id INT UNSIGNED NULL,
  CONSTRAINT fk_character_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS character_names (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS player_variants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  character_id INT UNSIGNED NULL,
  name VARCHAR(191) NOT NULL,
  variant_label VARCHAR(191) NULL,
  origin_work_id INT UNSIGNED NULL,
  element ENUM('wind', 'forest', 'fire', 'mountain', 'void') NULL,
  position ENUM('GK', 'DF', 'MF', 'FW') NULL,
  role VARCHAR(32) NULL,
  gender ENUM('male', 'female', 'neutral') NULL,
  play_style ENUM('breach', 'tension', 'counter', 'bond', 'rough_play', 'justice') NULL,
  style_source_record_id INT UNSIGNED NULL,
  age_group VARCHAR(32) NULL,
  school_year VARCHAR(32) NULL,
  portrait_url VARCHAR(1024) NULL,
  source_record_id INT UNSIGNED NULL,
  KEY idx_variant_name (name),
  KEY idx_variant_filters (position, element, id),
  KEY idx_variant_profile (gender, play_style, id),
  CONSTRAINT fk_variant_style_source FOREIGN KEY (style_source_record_id) REFERENCES source_records(id),
  KEY idx_variant_origin (origin_work_id, id),
  CONSTRAINT fk_variant_character FOREIGN KEY (character_id) REFERENCES characters(id),
  CONSTRAINT fk_variant_origin FOREIGN KEY (origin_work_id) REFERENCES works(id),
  CONSTRAINT fk_variant_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS variant_components (
  variant_id INT UNSIGNED NOT NULL,
  character_id INT UNSIGNED NOT NULL,
  role ENUM('base', 'donor') NOT NULL,
  source_record_id INT UNSIGNED NULL,
  PRIMARY KEY (variant_id, character_id, role),
  CONSTRAINT fk_component_variant FOREIGN KEY (variant_id) REFERENCES player_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_component_character FOREIGN KEY (character_id) REFERENCES characters(id),
  CONSTRAINT fk_component_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS variant_external_ids (
  source_id INT UNSIGNED NOT NULL,
  external_key VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  variant_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (source_id, external_key),
  CONSTRAINT fk_variant_external_source FOREIGN KEY (source_id) REFERENCES data_sources(id),
  CONSTRAINT fk_variant_external_variant FOREIGN KEY (variant_id) REFERENCES player_variants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS variant_source_links (
  variant_id INT UNSIGNED NOT NULL,
  source_record_id INT UNSIGNED NOT NULL,
  scope ENUM('identity', 'techniques', 'acquisition') NOT NULL,
  match_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  PRIMARY KEY (variant_id, source_record_id, scope),
  KEY idx_variant_match (match_status, scope),
  CONSTRAINT fk_variant_link_variant FOREIGN KEY (variant_id) REFERENCES player_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_variant_link_record FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS variant_appearances (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  variant_id INT UNSIGNED NOT NULL,
  work_id INT UNSIGNED NOT NULL,
  source_record_id INT UNSIGNED NULL,
  UNIQUE KEY uq_variant_appearance (variant_id, work_id),
  KEY idx_appearance_work (work_id, variant_id),
  CONSTRAINT fk_appearance_variant FOREIGN KEY (variant_id) REFERENCES player_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_appearance_work FOREIGN KEY (work_id) REFERENCES works(id),
  CONSTRAINT fk_appearance_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS historical_teams (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  name VARCHAR(191) NOT NULL,
  source_record_id INT UNSIGNED NULL,
  CONSTRAINT fk_historical_team_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS appearance_teams (
  appearance_id INT UNSIGNED NOT NULL,
  historical_team_id INT UNSIGNED NOT NULL,
  source_record_id INT UNSIGNED NULL,
  PRIMARY KEY (appearance_id, historical_team_id),
  KEY idx_appearance_team (historical_team_id, appearance_id),
  CONSTRAINT fk_membership_appearance FOREIGN KEY (appearance_id) REFERENCES variant_appearances(id) ON DELETE CASCADE,
  CONSTRAINT fk_membership_team FOREIGN KEY (historical_team_id) REFERENCES historical_teams(id),
  CONSTRAINT fk_membership_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS rarities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS variant_rarities (
  variant_id INT UNSIGNED NOT NULL,
  rarity_id INT UNSIGNED NOT NULL,
  source_record_id INT UNSIGNED NULL,
  PRIMARY KEY (variant_id, rarity_id),
  CONSTRAINT fk_variant_rarity_variant FOREIGN KEY (variant_id) REFERENCES player_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_variant_rarity_rarity FOREIGN KEY (rarity_id) REFERENCES rarities(id),
  CONSTRAINT fk_variant_rarity_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS game_contexts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  work_id INT UNSIGNED NOT NULL,
  mode_code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  game_version VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  UNIQUE KEY uq_game_context (work_id, mode_code, game_version),
  CONSTRAINT fk_context_work FOREIGN KEY (work_id) REFERENCES works(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS player_stat_profiles (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS techniques (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS technique_names (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS technique_external_ids (
  source_id INT UNSIGNED NOT NULL,
  external_key VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  technique_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (source_id, external_key),
  CONSTRAINT fk_technique_external_source FOREIGN KEY (source_id) REFERENCES data_sources(id),
  CONSTRAINT fk_technique_external_technique FOREIGN KEY (technique_id) REFERENCES techniques(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS technique_stat_profiles (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS variant_learnsets (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS learnset_rarities (
  learnset_id INT UNSIGNED NOT NULL,
  rarity_id INT UNSIGNED NOT NULL,
  source_record_id INT UNSIGNED NULL,
  PRIMARY KEY (learnset_id, rarity_id),
  CONSTRAINT fk_learnset_rarity_learnset FOREIGN KEY (learnset_id) REFERENCES variant_learnsets(id) ON DELETE CASCADE,
  CONSTRAINT fk_learnset_rarity_rarity FOREIGN KEY (rarity_id) REFERENCES rarities(id),
  CONSTRAINT fk_learnset_rarity_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  discord_id VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  avatar_url VARCHAR(1024) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS user_collection (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS formations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS formation_positions (
  formation_id INT UNSIGNED NOT NULL,
  slot_number TINYINT UNSIGNED NOT NULL,
  position ENUM('GK', 'DF', 'MF', 'FW') NOT NULL,
  x DECIMAL(5, 2) NOT NULL,
  y DECIMAL(5, 2) NOT NULL,
  PRIMARY KEY (formation_id, slot_number),
  CONSTRAINT ck_formation_slot CHECK (slot_number BETWEEN 1 AND 11),
  CONSTRAINT ck_formation_coordinates CHECK (x BETWEEN 0 AND 100 AND y BETWEEN 0 AND 100),
  CONSTRAINT fk_formation_position FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS squads (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS squad_players (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS squad_player_techniques (
  squad_player_id INT UNSIGNED NOT NULL,
  variant_id INT UNSIGNED NOT NULL,
  slot_number TINYINT UNSIGNED NOT NULL,
  learnset_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (squad_player_id, slot_number),
  UNIQUE KEY uq_squad_player_technique (squad_player_id, learnset_id),
  CONSTRAINT ck_squad_technique_slot CHECK (slot_number > 0),
  CONSTRAINT fk_squad_technique_player FOREIGN KEY (squad_player_id, variant_id) REFERENCES squad_players(id, variant_id) ON DELETE CASCADE,
  CONSTRAINT fk_squad_technique_learnset FOREIGN KEY (learnset_id, variant_id) REFERENCES variant_learnsets(id, variant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS squad_staff (
  squad_id INT UNSIGNED NOT NULL,
  variant_id INT UNSIGNED NOT NULL,
  role ENUM('coach', 'manager') NOT NULL,
  slot_number TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (squad_id, role, slot_number),
  UNIQUE KEY uq_squad_staff_variant (squad_id, variant_id),
  CONSTRAINT ck_squad_staff_slot CHECK (slot_number > 0),
  CONSTRAINT fk_squad_staff_squad FOREIGN KEY (squad_id) REFERENCES squads(id) ON DELETE CASCADE,
  CONSTRAINT fk_squad_staff_variant FOREIGN KEY (variant_id) REFERENCES player_variants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS catalogue_items (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS catalogue_passives (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS team_badges (
  historical_team_id INT UNSIGNED PRIMARY KEY,
  image_url VARCHAR(1024) NOT NULL,
  source_url VARCHAR(1024) NOT NULL,
  CONSTRAINT fk_team_badge_team FOREIGN KEY (historical_team_id) REFERENCES historical_teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS auth_states (
  state_hash BINARY(32) PRIMARY KEY,
  browser_hash BINARY(32) NOT NULL,
  verifier VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  return_to VARCHAR(1024) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  KEY idx_auth_state_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash BINARY(32) PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_auth_session_expiry (expires_at),
  KEY idx_auth_session_user (user_id),
  CONSTRAINT fk_auth_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS user_teams (
  user_id INT UNSIGNED NOT NULL,
  team_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload JSON NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (user_id, team_id),
  KEY idx_user_team_updated (user_id, updated_at),
  CONSTRAINT fk_user_team_owner FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(`CREATE TABLE IF NOT EXISTS user_team_drafts (
  user_id INT UNSIGNED PRIMARY KEY,
  payload JSON NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_user_team_draft_owner FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    this.addSql(
      `INSERT INTO formations (code, name) VALUES ('4-4-2-diamond', '4-4-2 Diamant') ON DUPLICATE KEY UPDATE name = '4-4-2 Diamant'`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 1, 'GK', 50, 0 FROM formations WHERE code = '4-4-2-diamond' ON DUPLICATE KEY UPDATE position = 'GK', x = 50, y = 0`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 2, 'DF', 41.5, 13 FROM formations WHERE code = '4-4-2-diamond' ON DUPLICATE KEY UPDATE position = 'DF', x = 41.5, y = 13`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 3, 'DF', 58.5, 13 FROM formations WHERE code = '4-4-2-diamond' ON DUPLICATE KEY UPDATE position = 'DF', x = 58.5, y = 13`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 4, 'DF', 20, 21.7 FROM formations WHERE code = '4-4-2-diamond' ON DUPLICATE KEY UPDATE position = 'DF', x = 20, y = 21.7`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 5, 'DF', 80, 21.7 FROM formations WHERE code = '4-4-2-diamond' ON DUPLICATE KEY UPDATE position = 'DF', x = 80, y = 21.7`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 6, 'MF', 50, 34.8 FROM formations WHERE code = '4-4-2-diamond' ON DUPLICATE KEY UPDATE position = 'MF', x = 50, y = 34.8`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 7, 'MF', 27.5, 56.5 FROM formations WHERE code = '4-4-2-diamond' ON DUPLICATE KEY UPDATE position = 'MF', x = 27.5, y = 56.5`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 8, 'MF', 72.5, 56.5 FROM formations WHERE code = '4-4-2-diamond' ON DUPLICATE KEY UPDATE position = 'MF', x = 72.5, y = 56.5`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 9, 'MF', 50, 87 FROM formations WHERE code = '4-4-2-diamond' ON DUPLICATE KEY UPDATE position = 'MF', x = 50, y = 87`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 10, 'FW', 22.5, 100 FROM formations WHERE code = '4-4-2-diamond' ON DUPLICATE KEY UPDATE position = 'FW', x = 22.5, y = 100`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 11, 'FW', 77.5, 100 FROM formations WHERE code = '4-4-2-diamond' ON DUPLICATE KEY UPDATE position = 'FW', x = 77.5, y = 100`,
    );
    this.addSql(
      `INSERT INTO formations (code, name) VALUES ('4-4-2-box', '4-4-2 Carré') ON DUPLICATE KEY UPDATE name = '4-4-2 Carré'`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 1, 'GK', 50, 0 FROM formations WHERE code = '4-4-2-box' ON DUPLICATE KEY UPDATE position = 'GK', x = 50, y = 0`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 2, 'DF', 41.5, 13 FROM formations WHERE code = '4-4-2-box' ON DUPLICATE KEY UPDATE position = 'DF', x = 41.5, y = 13`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 3, 'DF', 58.5, 13 FROM formations WHERE code = '4-4-2-box' ON DUPLICATE KEY UPDATE position = 'DF', x = 58.5, y = 13`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 4, 'DF', 20, 21.7 FROM formations WHERE code = '4-4-2-box' ON DUPLICATE KEY UPDATE position = 'DF', x = 20, y = 21.7`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 5, 'DF', 80, 21.7 FROM formations WHERE code = '4-4-2-box' ON DUPLICATE KEY UPDATE position = 'DF', x = 80, y = 21.7`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 6, 'MF', 37.5, 39.1 FROM formations WHERE code = '4-4-2-box' ON DUPLICATE KEY UPDATE position = 'MF', x = 37.5, y = 39.1`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 7, 'MF', 62.5, 39.1 FROM formations WHERE code = '4-4-2-box' ON DUPLICATE KEY UPDATE position = 'MF', x = 62.5, y = 39.1`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 8, 'MF', 25, 69.6 FROM formations WHERE code = '4-4-2-box' ON DUPLICATE KEY UPDATE position = 'MF', x = 25, y = 69.6`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 9, 'MF', 75, 69.6 FROM formations WHERE code = '4-4-2-box' ON DUPLICATE KEY UPDATE position = 'MF', x = 75, y = 69.6`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 10, 'FW', 40, 100 FROM formations WHERE code = '4-4-2-box' ON DUPLICATE KEY UPDATE position = 'FW', x = 40, y = 100`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 11, 'FW', 60, 100 FROM formations WHERE code = '4-4-2-box' ON DUPLICATE KEY UPDATE position = 'FW', x = 60, y = 100`,
    );
    this.addSql(
      `INSERT INTO formations (code, name) VALUES ('3-5-2-freedom', '3-5-2 Liberté') ON DUPLICATE KEY UPDATE name = '3-5-2 Liberté'`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 1, 'GK', 50, 0 FROM formations WHERE code = '3-5-2-freedom' ON DUPLICATE KEY UPDATE position = 'GK', x = 50, y = 0`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 2, 'DF', 27.5, 17.4 FROM formations WHERE code = '3-5-2-freedom' ON DUPLICATE KEY UPDATE position = 'DF', x = 27.5, y = 17.4`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 3, 'DF', 50, 17.4 FROM formations WHERE code = '3-5-2-freedom' ON DUPLICATE KEY UPDATE position = 'DF', x = 50, y = 17.4`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 4, 'DF', 72.5, 17.4 FROM formations WHERE code = '3-5-2-freedom' ON DUPLICATE KEY UPDATE position = 'DF', x = 72.5, y = 17.4`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 5, 'MF', 37.5, 43.5 FROM formations WHERE code = '3-5-2-freedom' ON DUPLICATE KEY UPDATE position = 'MF', x = 37.5, y = 43.5`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 6, 'MF', 62.5, 43.5 FROM formations WHERE code = '3-5-2-freedom' ON DUPLICATE KEY UPDATE position = 'MF', x = 62.5, y = 43.5`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 7, 'MF', 17.5, 60.9 FROM formations WHERE code = '3-5-2-freedom' ON DUPLICATE KEY UPDATE position = 'MF', x = 17.5, y = 60.9`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 8, 'MF', 82.5, 60.9 FROM formations WHERE code = '3-5-2-freedom' ON DUPLICATE KEY UPDATE position = 'MF', x = 82.5, y = 60.9`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 9, 'MF', 50, 78.3 FROM formations WHERE code = '3-5-2-freedom' ON DUPLICATE KEY UPDATE position = 'MF', x = 50, y = 78.3`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 10, 'FW', 37.5, 100 FROM formations WHERE code = '3-5-2-freedom' ON DUPLICATE KEY UPDATE position = 'FW', x = 37.5, y = 100`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 11, 'FW', 62.5, 100 FROM formations WHERE code = '3-5-2-freedom' ON DUPLICATE KEY UPDATE position = 'FW', x = 62.5, y = 100`,
    );
    this.addSql(
      `INSERT INTO formations (code, name) VALUES ('4-3-3-triangle', '4-3-3 Triangle') ON DUPLICATE KEY UPDATE name = '4-3-3 Triangle'`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 1, 'GK', 50, 0 FROM formations WHERE code = '4-3-3-triangle' ON DUPLICATE KEY UPDATE position = 'GK', x = 50, y = 0`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 2, 'DF', 35, 21.7 FROM formations WHERE code = '4-3-3-triangle' ON DUPLICATE KEY UPDATE position = 'DF', x = 35, y = 21.7`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 3, 'DF', 65, 21.7 FROM formations WHERE code = '4-3-3-triangle' ON DUPLICATE KEY UPDATE position = 'DF', x = 65, y = 21.7`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 4, 'DF', 17.5, 28.3 FROM formations WHERE code = '4-3-3-triangle' ON DUPLICATE KEY UPDATE position = 'DF', x = 17.5, y = 28.3`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 5, 'DF', 82.5, 28.3 FROM formations WHERE code = '4-3-3-triangle' ON DUPLICATE KEY UPDATE position = 'DF', x = 82.5, y = 28.3`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 6, 'MF', 40, 47.8 FROM formations WHERE code = '4-3-3-triangle' ON DUPLICATE KEY UPDATE position = 'MF', x = 40, y = 47.8`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 7, 'MF', 60, 47.8 FROM formations WHERE code = '4-3-3-triangle' ON DUPLICATE KEY UPDATE position = 'MF', x = 60, y = 47.8`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 8, 'MF', 50, 69.6 FROM formations WHERE code = '4-3-3-triangle' ON DUPLICATE KEY UPDATE position = 'MF', x = 50, y = 69.6`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 9, 'FW', 20, 78.3 FROM formations WHERE code = '4-3-3-triangle' ON DUPLICATE KEY UPDATE position = 'FW', x = 20, y = 78.3`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 10, 'FW', 80, 78.3 FROM formations WHERE code = '4-3-3-triangle' ON DUPLICATE KEY UPDATE position = 'FW', x = 80, y = 78.3`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 11, 'FW', 50, 100 FROM formations WHERE code = '4-3-3-triangle' ON DUPLICATE KEY UPDATE position = 'FW', x = 50, y = 100`,
    );
    this.addSql(
      `INSERT INTO formations (code, name) VALUES ('4-3-3-delta', '4-3-3 Delta') ON DUPLICATE KEY UPDATE name = '4-3-3 Delta'`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 1, 'GK', 50, 0 FROM formations WHERE code = '4-3-3-delta' ON DUPLICATE KEY UPDATE position = 'GK', x = 50, y = 0`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 2, 'DF', 37.5, 17.4 FROM formations WHERE code = '4-3-3-delta' ON DUPLICATE KEY UPDATE position = 'DF', x = 37.5, y = 17.4`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 3, 'DF', 62.5, 17.4 FROM formations WHERE code = '4-3-3-delta' ON DUPLICATE KEY UPDATE position = 'DF', x = 62.5, y = 17.4`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 4, 'DF', 15, 32.6 FROM formations WHERE code = '4-3-3-delta' ON DUPLICATE KEY UPDATE position = 'DF', x = 15, y = 32.6`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 5, 'DF', 85, 32.6 FROM formations WHERE code = '4-3-3-delta' ON DUPLICATE KEY UPDATE position = 'DF', x = 85, y = 32.6`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 6, 'MF', 50, 39.1 FROM formations WHERE code = '4-3-3-delta' ON DUPLICATE KEY UPDATE position = 'MF', x = 50, y = 39.1`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 7, 'MF', 37.5, 69.6 FROM formations WHERE code = '4-3-3-delta' ON DUPLICATE KEY UPDATE position = 'MF', x = 37.5, y = 69.6`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 8, 'MF', 62.5, 69.6 FROM formations WHERE code = '4-3-3-delta' ON DUPLICATE KEY UPDATE position = 'MF', x = 62.5, y = 69.6`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 9, 'FW', 20, 82.6 FROM formations WHERE code = '4-3-3-delta' ON DUPLICATE KEY UPDATE position = 'FW', x = 20, y = 82.6`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 10, 'FW', 80, 82.6 FROM formations WHERE code = '4-3-3-delta' ON DUPLICATE KEY UPDATE position = 'FW', x = 80, y = 82.6`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 11, 'FW', 50, 100 FROM formations WHERE code = '4-3-3-delta' ON DUPLICATE KEY UPDATE position = 'FW', x = 50, y = 100`,
    );
    this.addSql(
      `INSERT INTO formations (code, name) VALUES ('4-5-1-balanced', '4-5-1 Équilibré') ON DUPLICATE KEY UPDATE name = '4-5-1 Équilibré'`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 1, 'GK', 50, 0 FROM formations WHERE code = '4-5-1-balanced' ON DUPLICATE KEY UPDATE position = 'GK', x = 50, y = 0`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 2, 'DF', 40, 19.5 FROM formations WHERE code = '4-5-1-balanced' ON DUPLICATE KEY UPDATE position = 'DF', x = 40, y = 19.5`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 3, 'DF', 60, 19.5 FROM formations WHERE code = '4-5-1-balanced' ON DUPLICATE KEY UPDATE position = 'DF', x = 60, y = 19.5`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 4, 'DF', 16, 26.5 FROM formations WHERE code = '4-5-1-balanced' ON DUPLICATE KEY UPDATE position = 'DF', x = 16, y = 26.5`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 5, 'DF', 84, 26.5 FROM formations WHERE code = '4-5-1-balanced' ON DUPLICATE KEY UPDATE position = 'DF', x = 84, y = 26.5`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 6, 'MF', 42.5, 48.7 FROM formations WHERE code = '4-5-1-balanced' ON DUPLICATE KEY UPDATE position = 'MF', x = 42.5, y = 48.7`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 7, 'MF', 57.5, 48.7 FROM formations WHERE code = '4-5-1-balanced' ON DUPLICATE KEY UPDATE position = 'MF', x = 57.5, y = 48.7`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 8, 'MF', 20, 70.8 FROM formations WHERE code = '4-5-1-balanced' ON DUPLICATE KEY UPDATE position = 'MF', x = 20, y = 70.8`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 9, 'MF', 80, 70.8 FROM formations WHERE code = '4-5-1-balanced' ON DUPLICATE KEY UPDATE position = 'MF', x = 80, y = 70.8`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 10, 'MF', 50, 79.6 FROM formations WHERE code = '4-5-1-balanced' ON DUPLICATE KEY UPDATE position = 'MF', x = 50, y = 79.6`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 11, 'FW', 50, 100 FROM formations WHERE code = '4-5-1-balanced' ON DUPLICATE KEY UPDATE position = 'FW', x = 50, y = 100`,
    );
    this.addSql(
      `INSERT INTO formations (code, name) VALUES ('3-6-1-hexa', '3-6-1 Hexa') ON DUPLICATE KEY UPDATE name = '3-6-1 Hexa'`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 1, 'GK', 50, 0 FROM formations WHERE code = '3-6-1-hexa' ON DUPLICATE KEY UPDATE position = 'GK', x = 50, y = 0`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 2, 'DF', 50, 16.7 FROM formations WHERE code = '3-6-1-hexa' ON DUPLICATE KEY UPDATE position = 'DF', x = 50, y = 16.7`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 3, 'DF', 25, 18.3 FROM formations WHERE code = '3-6-1-hexa' ON DUPLICATE KEY UPDATE position = 'DF', x = 25, y = 18.3`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 4, 'DF', 75, 18.3 FROM formations WHERE code = '3-6-1-hexa' ON DUPLICATE KEY UPDATE position = 'DF', x = 75, y = 18.3`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 5, 'MF', 12.5, 45.8 FROM formations WHERE code = '3-6-1-hexa' ON DUPLICATE KEY UPDATE position = 'MF', x = 12.5, y = 45.8`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 6, 'MF', 87.5, 45.8 FROM formations WHERE code = '3-6-1-hexa' ON DUPLICATE KEY UPDATE position = 'MF', x = 87.5, y = 45.8`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 7, 'MF', 37.5, 47.5 FROM formations WHERE code = '3-6-1-hexa' ON DUPLICATE KEY UPDATE position = 'MF', x = 37.5, y = 47.5`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 8, 'MF', 62.5, 47.5 FROM formations WHERE code = '3-6-1-hexa' ON DUPLICATE KEY UPDATE position = 'MF', x = 62.5, y = 47.5`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 9, 'MF', 25, 72.9 FROM formations WHERE code = '3-6-1-hexa' ON DUPLICATE KEY UPDATE position = 'MF', x = 25, y = 72.9`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 10, 'MF', 75, 72.9 FROM formations WHERE code = '3-6-1-hexa' ON DUPLICATE KEY UPDATE position = 'MF', x = 75, y = 72.9`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 11, 'FW', 50, 100 FROM formations WHERE code = '3-6-1-hexa' ON DUPLICATE KEY UPDATE position = 'FW', x = 50, y = 100`,
    );
    this.addSql(
      `INSERT INTO formations (code, name) VALUES ('5-4-1-double-volante', '5-4-1 Double Volante') ON DUPLICATE KEY UPDATE name = '5-4-1 Double Volante'`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 1, 'GK', 50, 0 FROM formations WHERE code = '5-4-1-double-volante' ON DUPLICATE KEY UPDATE position = 'GK', x = 50, y = 0`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 2, 'DF', 50, 13.6 FROM formations WHERE code = '5-4-1-double-volante' ON DUPLICATE KEY UPDATE position = 'DF', x = 50, y = 13.6`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 3, 'DF', 27.5, 18.2 FROM formations WHERE code = '5-4-1-double-volante' ON DUPLICATE KEY UPDATE position = 'DF', x = 27.5, y = 18.2`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 4, 'DF', 72.5, 18.2 FROM formations WHERE code = '5-4-1-double-volante' ON DUPLICATE KEY UPDATE position = 'DF', x = 72.5, y = 18.2`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 5, 'DF', 12.5, 27.3 FROM formations WHERE code = '5-4-1-double-volante' ON DUPLICATE KEY UPDATE position = 'DF', x = 12.5, y = 27.3`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 6, 'DF', 87.5, 27.3 FROM formations WHERE code = '5-4-1-double-volante' ON DUPLICATE KEY UPDATE position = 'DF', x = 87.5, y = 27.3`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 7, 'MF', 37.5, 40.9 FROM formations WHERE code = '5-4-1-double-volante' ON DUPLICATE KEY UPDATE position = 'MF', x = 37.5, y = 40.9`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 8, 'MF', 62.5, 40.9 FROM formations WHERE code = '5-4-1-double-volante' ON DUPLICATE KEY UPDATE position = 'MF', x = 62.5, y = 40.9`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 9, 'MF', 25, 68.2 FROM formations WHERE code = '5-4-1-double-volante' ON DUPLICATE KEY UPDATE position = 'MF', x = 25, y = 68.2`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 10, 'MF', 75, 68.2 FROM formations WHERE code = '5-4-1-double-volante' ON DUPLICATE KEY UPDATE position = 'MF', x = 75, y = 68.2`,
    );
    this.addSql(
      `INSERT INTO formation_positions (formation_id, slot_number, position, x, y) SELECT id, 11, 'FW', 50, 100 FROM formations WHERE code = '5-4-1-double-volante' ON DUPLICATE KEY UPDATE position = 'FW', x = 50, y = 100`,
    );
  }
}
