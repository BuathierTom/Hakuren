-- Apply once to a database created with the original step-2 schema.
ALTER TABLE player_variants
  MODIFY element ENUM('wind', 'forest', 'fire', 'mountain', 'void') NULL,
  MODIFY gender ENUM('male', 'female', 'neutral') NULL;

ALTER TABLE techniques
  MODIFY element ENUM('wind', 'forest', 'fire', 'mountain', 'void') NULL;

ALTER TABLE variant_learnsets
  ADD is_current BOOLEAN NOT NULL DEFAULT TRUE,
  ADD CONSTRAINT ck_learnset_current CHECK (is_current IN (0, 1)),
  DROP INDEX idx_learnset_lookup,
  ADD INDEX idx_learnset_lookup (variant_id, context_id, is_current);
