USE vitalis;

CREATE TABLE IF NOT EXISTS metrics (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_metrics_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  INDEX idx_metrics_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
