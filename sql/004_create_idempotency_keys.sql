USE vitalis;

-- Cachea la respuesta de un POST/PUT identificado por un header Idempotency-Key,
-- para que reintentos por timeout/reconexión del cliente devuelvan la misma
-- respuesta en vez de duplicar el efecto (crear el registro dos veces, etc.).
CREATE TABLE IF NOT EXISTS idempotency_keys (
  idempotency_key VARCHAR(255) NOT NULL,
  route VARCHAR(255) NOT NULL,
  user_id CHAR(36) NULL,
  request_hash CHAR(64) NOT NULL,
  response_status SMALLINT UNSIGNED NOT NULL,
  response_body JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (idempotency_key, route),
  CONSTRAINT fk_idempotency_keys_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
