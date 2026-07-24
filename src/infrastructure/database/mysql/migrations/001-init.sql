CREATE TABLE IF NOT EXISTS metrics (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
);
