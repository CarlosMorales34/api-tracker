USE vitalis;

CREATE TABLE IF NOT EXISTS metric_entries (
  id CHAR(36) PRIMARY KEY,
  metric_id CHAR(36) NOT NULL,
  value DOUBLE NOT NULL,
  note VARCHAR(280) NULL,
  recorded_at DATETIME NOT NULL,
  CONSTRAINT fk_metric_entries_metric
    FOREIGN KEY (metric_id) REFERENCES metrics (id)
    ON DELETE CASCADE,
  INDEX idx_metric_entries_metric_id (metric_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
