CREATE TABLE IF NOT EXISTS auth_states (
  state_hash BINARY(32) PRIMARY KEY,
  browser_hash BINARY(32) NOT NULL,
  verifier VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  return_to VARCHAR(1024) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  KEY idx_auth_state_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash BINARY(32) PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_auth_session_expiry (expires_at),
  KEY idx_auth_session_user (user_id),
  CONSTRAINT fk_auth_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
