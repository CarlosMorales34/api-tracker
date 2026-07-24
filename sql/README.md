# SQL — vitalis

Scripts canónicos e idempotentes (usan `IF NOT EXISTS`, sin `DEFINER`) para
crear el schema de `vitalis` en cualquier entorno (local, staging, prod).
Correr en orden ascendente por prefijo numérico.

```bash
mysql -h <host> -P <port> -u <user> -p < 000_create_database.sql
mysql -h <host> -P <port> -u <user> -p < 001_create_users.sql
mysql -h <host> -P <port> -u <user> -p < 002_create_metrics.sql
mysql -h <host> -P <port> -u <user> -p < 003_create_metric_entries.sql
mysql -h <host> -P <port> -u <user> -p < 004_create_idempotency_keys.sql
```

O todo junto:

```bash
for f in sql/0*.sql; do mysql -h <host> -P <port> -u <user> -p < "$f"; done
```

## Tablas

- `users` — cuentas (email único, password con hash bcrypt)
- `metrics` — métricas definidas por un usuario (`user_id` FK), ej. "Peso"
- `metric_entries` — mediciones registradas para una métrica
- `idempotency_keys` — cache de respuestas por `Idempotency-Key` para
  endpoints POST/PUT, evita efectos duplicados en reintentos de red

Este es el schema canónico. La migración que corre `docker-compose up` (para
desarrollo aislado en contenedor) vive en
`src/infrastructure/database/mysql/migrations/` y debe mantenerse igual a
estos archivos — si cambias uno, cambia el otro.
