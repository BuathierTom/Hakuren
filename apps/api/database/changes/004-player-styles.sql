ALTER TABLE player_variants
  ADD COLUMN play_style ENUM('breach', 'tension', 'counter', 'bond', 'rough_play', 'justice') NULL,
  ADD COLUMN style_source_record_id INT UNSIGNED NULL,
  ADD KEY idx_variant_profile (gender, play_style, id),
  ADD CONSTRAINT fk_variant_style_source FOREIGN KEY (style_source_record_id) REFERENCES source_records(id);
