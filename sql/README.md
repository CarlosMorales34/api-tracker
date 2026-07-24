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
mysql -h <host> -P <port> -u <user> -p < 005_create_activity_categories.sql
mysql -h <host> -P <port> -u <user> -p < 006_create_activities.sql
mysql -h <host> -P <port> -u <user> -p < 007_create_activity_logs.sql
mysql -h <host> -P <port> -u <user> -p < 008_create_fixed_routines.sql
mysql -h <host> -P <port> -u <user> -p < 009_create_routine_logs.sql
mysql -h <host> -P <port> -u <user> -p < 010_create_finance_entries.sql
mysql -h <host> -P <port> -u <user> -p < 011_create_daily_expenses.sql
mysql -h <host> -P <port> -u <user> -p < 012_create_weight_entries.sql
mysql -h <host> -P <port> -u <user> -p < 013_create_weekly_log_tables.sql
mysql -h <host> -P <port> -u <user> -p < 014_alter_weight_settings_goal_direction.sql
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
- `activity_categories` — categorías de actividades por usuario (ej. "Estudios"), con color
- `activities` — actividades dentro de una categoría (ej. "Lectura")
- `activity_logs` — horas registradas por actividad y día (`UNIQUE(activity_id, log_date)`)
- `fixed_routines` — rutinas fijas recurrentes por usuario (ej. "Trabajaste"), `type` single/range
- `routine_logs` / `routine_log_times` — registro de una rutina en un día
  específico y sus rangos de hora (1 rango si `single`, 1+ si `range`)
- `finance_entries` — ingresos/gastos por semana (módulo Finanzas)
- `user_finance_settings` — deuda total y moneda por usuario (singleton)
- `finance_debt_payments` / `finance_savings_log` — abonos y ahorro por semana (se suman, no se duplican en settings)
- `daily_expenses` — gasto variable por día (módulo Gastos diarios)
- `fixed_monthly_expenses` — gastos fijos recurrentes (seguros, suscripciones)
- `weight_entries` — peso por año/mes (`UNIQUE(user_id,year,month)`) + nota opcional
- `user_weight_settings` — meta de peso por usuario (singleton), incluye
  `goal_direction` (`'lose'|'gain'`, default `'lose'`) — define si "mejor
  histórico" busca el mínimo o el máximo registrado
- `annual_counters` — contadores libres por año (ej. "Libros leídos")
- `week_notes` — reflexión de texto por semana del año
- `user_productivity_settings` — meta de horas productivas semanales (singleton, default 112)

Este es el schema canónico. La migración que corre `docker-compose up` (para
desarrollo aislado en contenedor) vive en
`src/infrastructure/database/mysql/migrations/` y debe mantenerse igual a
estos archivos — si cambias uno, cambia el otro.
