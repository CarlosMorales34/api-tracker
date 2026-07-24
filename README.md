# samarya — vitalis API

API de **vitalis**, app personal de auto-seguimiento (peso, hábitos, métricas custom).
Node.js + TypeScript, Clean Architecture + SOLID, MySQL. Autenticación JWT,
idempotencia, rate limiting y documentación OpenAPI incluidas.

## Arquitectura

```
src/
  domain/           # Entidades, contratos de repositorio y de servicios (sin dependencias externas)
  application/      # Casos de uso — orquestan el dominio, dependen de abstracciones
  infrastructure/   # MySQL, Express, JWT/bcrypt, config — implementaciones concretas
  presentation/     # Controllers, rutas, middlewares y validadores HTTP
  main/             # Composition root — arma las dependencias e inicia el servidor
```

La regla de dependencia se respeta de afuera hacia adentro: `presentation` e
`infrastructure` dependen de `application`/`domain`, nunca al revés. Las
abstracciones cruzadas (hashing de passwords, firma/verificación de JWT,
idempotencia) viven como interfaces en `domain/services` y
`domain/repositories`, e `infrastructure` las implementa.

## Levantar en local

```bash
cp .env.example .env   # y completa JWT_SECRET con un valor random fuerte
docker compose up -d   # levanta MySQL con el schema inicial (si no usas XAMPP/MariaDB local)
npm install
npm run dev             # http://localhost:4000
```

`.env` se carga automáticamente al arrancar (`process.loadEnvFile()`, nativo
de Node 20.12+) — no hace falta ningún flag ni dependencia extra.

## Documentación (Swagger / OpenAPI)

- UI interactiva: `GET /docs`
- Spec crudo (JSON): `GET /docs.json`

Todos los endpoints (auth, metrics, metric-entries, activity-categories,
activities, fixed-routines, activity-logs, finance, expenses, weight,
weekly-log) están documentados con anotaciones `@openapi` en sus archivos de
rutas (`src/presentation/routes/*.ts`), incluyendo requestBody/response
schemas, códigos de error, el header `Idempotency-Key` donde aplica y
`Authorization: Bearer` donde aplica.

## Endpoints

### Auth (públicos, con rate limit estricto en `/api/auth/*`)

- `POST /api/auth/register` — `{ email, password, name }` → `201` con
  `{ user, accessToken }` + cookie httpOnly `refresh_token`. Soporta header
  `Idempotency-Key`. `409` si el email ya existe.
- `POST /api/auth/login` — `{ email, password }` → `200` con
  `{ user, accessToken }` + cookie `refresh_token`. `401` genérico
  ("credenciales inválidas") sin distinguir email inexistente de password
  incorrecto.
- `POST /api/auth/refresh` — lee la cookie `refresh_token` → `200` con
  `{ accessToken }` nuevo.
- `POST /api/auth/logout` — limpia la cookie `refresh_token` → `204`.

### Metrics / Metric Entries (protegidos, requieren `Authorization: Bearer <accessToken>`)

- `POST /api/metrics` — crear una métrica propia (`{ name, unit }`). Soporta
  `Idempotency-Key`.
- `GET /api/metrics?limit=&offset=` — listar métricas propias, paginado
  (`limit` default 50, máx 100; `offset` default 0).
- `POST /api/metric-entries` — registrar una medición
  (`{ metricId, value, note? }`) sobre una métrica propia. Soporta
  `Idempotency-Key`. `404` si `metricId` no existe o no pertenece al usuario.
- `GET /api/metric-entries/:metricId` — historial de una métrica propia.
  `404` si no existe o no pertenece al usuario.

### Actividades diarias (protegidos, requieren `Authorization: Bearer <accessToken>`)

- `POST /api/activity-categories` — crear una categoría de actividad propia
  (`{ name, color }`, `color` en hex `#RRGGBB`). Soporta `Idempotency-Key`.
- `GET /api/activity-categories` — listar categorías propias, ordenadas por
  `sortOrder` y luego fecha de creación.
- `POST /api/activities` — crear una actividad dentro de una categoría propia
  (`{ categoryId, name }`). Soporta `Idempotency-Key`. `404` si `categoryId`
  no existe o no pertenece al usuario.
- `GET /api/activities?categoryId=` — listar actividades propias. Con
  `categoryId`, filtra por esa categoría (`404` si no existe o no es del
  usuario); sin él, devuelve todas las actividades de todas las categorías
  del usuario.
- `POST /api/fixed-routines` — crear una rutina fija propia
  (`{ name, icon, type }`, `type` es `single` o `range`). Soporta
  `Idempotency-Key`.
- `GET /api/fixed-routines` — listar rutinas fijas propias, ordenadas por
  `sortOrder` y luego fecha de creación.
- `DELETE /api/fixed-routines/:id` — eliminar una rutina fija propia → `204`.
  `404` si no existe o no pertenece al usuario.

- `GET /api/activity-logs?from=YYYY-MM-DD&to=YYYY-MM-DD` — horas registradas
  por actividad en un rango de fechas, del usuario autenticado. Sin endpoint
  de escritura todavía (el front no tiene UI para capturar horas por día) —
  lo usa Registro semanal para calcular productividad/distribución.

`routine_logs`/`routine_log_times` (captura de horas por rutina fija) quedan
fuera de esta capa por ahora, mismo motivo, aunque las tablas ya existen en
el schema.

### Finanzas (protegidos)

- `GET /api/finance/settings` / `PUT /api/finance/settings` —
  `{ debtTotal, currency }` del usuario (singleton, default `{0, 'MXN'}`).
- `GET /api/finance/weeks/:weekStartDate` (sábado, `YYYY-MM-DD`) — resumen
  agregado de la semana: ingresos/gastos, balance, deuda restante y abono de
  esa semana, ahorro acumulado y de esa semana.
- `POST /api/finance/entries` (`{ type: 'income'|'expense', name, amount,
  weekStartDate }`) / `PATCH /api/finance/entries/:id`
  (`{ name?, amount? }`) / `DELETE /api/finance/entries/:id` — ingreso o
  gasto de una semana. `POST` soporta `Idempotency-Key`.
- `POST /api/finance/debt-payments` / `POST /api/finance/savings`
  (`{ weekStartDate, amount }`) — abono de deuda o ahorro de una semana (se
  acumulan, no reemplazan). Soportan `Idempotency-Key`.

### Gastos diarios (protegidos)

- `GET /api/expenses/daily?date=` / `POST /api/expenses/daily`
  (`{ name, amount, expenseDate }`) / `PATCH /api/expenses/daily/:id`
  / `DELETE /api/expenses/daily/:id` — gasto variable de un día.
- `GET /api/expenses/fixed` / `POST /api/expenses/fixed`
  (`{ name, amount }`) / `PATCH /api/expenses/fixed/:id`
  / `DELETE /api/expenses/fixed/:id` — gastos fijos recurrentes.
- `GET /api/expenses/summary?date=` — ingresos del mes (reutiliza
  `finance_entries`, no duplica el dato), gasto diario + fijo del mes,
  sobrante, total de la semana. `POST` de daily/fixed soportan
  `Idempotency-Key`.

### Peso (protegidos)

- `GET /api/weight/years/:year` — los 12 meses del año (`value`/`note` o
  `null`), peso actual, delta vs. mes anterior, mejor histórico (busca en
  todos los años, según `goalDirection`), meta.
- `PUT /api/weight/months` (`{ year, month, value }`, `value` puede ser
  `null` para borrar el dato) / `PUT /api/weight/months/note`
  (`{ year, month, note }`) — cada uno conserva el otro campo si no se manda.
- `GET /api/weight/settings` / `PUT /api/weight/settings`
  (`{ goalKg, goalDirection }`, `goalDirection` es `'lose'` o `'gain'` — define
  si "mejor histórico" busca el mínimo o el máximo registrado).
- `GET /api/weight/yearly-extremes` — mejor y peor mes de cada año con datos
  (`{ year, bestMonth, bestValue, worstMonth, worstValue }[]`), respetando
  `goalDirection`. Solo considera meses con valor capturado, así que años
  incompletos no se distorsionan; si un año tiene un solo mes con dato,
  `bestMonth === worstMonth` (caso honesto, no se oculta).

### Registro semanal (protegidos)

- `GET /api/weekly-log/years/:year` — productividad de las 52 semanas
  (`percent` = horas registradas / `weekly_target_hours` del usuario, `null`
  si la semana no tiene `activity_logs`), promedio anual y distribución de
  horas por categoría del año.
- `GET /api/weekly-log/weeks/:year/:weekNumber` — detalle de una semana:
  porcentaje, delta vs. semana anterior, horas por categoría, top 3
  actividades, notas.
- `PUT /api/weekly-log/weeks/:year/:weekNumber/notes` (`{ notes }`).
- `GET /api/weekly-log/counters?year=` / `POST /api/weekly-log/counters`
  (`{ name, year, value }`) / `DELETE /api/weekly-log/counters/:id` —
  contadores libres por año (ej. "Libros leídos"); el listado incluye
  `previousYearValue` si existe un contador con el mismo nombre el año
  anterior (el `POST` no lo calcula, solo el `GET`). `POST` soporta
  `Idempotency-Key`.

### Home (protegidos)

- `GET /api/home/summary` — agregado para el dashboard post-login: racha de
  días con actividad registrada, % de productividad de la semana actual +
  horas por categoría (reusa `GetWeeklyLogWeekUseCase`), balance del mes
  (Finanzas), peso actual + meta, y balance anual vs. hasta 3 años anteriores
  con datos. Cada sección trae su propio `hasData` boolean para que el front
  distinga "0 real" de "todavía sin datos" y muestre un estado vacío en vez
  de un cero engañoso.

### Otros

- `GET /health` — liveness check.
- `GET /docs`, `GET /docs.json` — documentación OpenAPI.

## Seguridad

- **Passwords**: hasheados con `bcryptjs` (cost 12). Se eligió `bcryptjs`
  sobre `bcrypt` nativo porque el binding nativo arrastra `node-pre-gyp` →
  `tar`, que en esta instalación traía una vulnerabilidad crítica reportada
  por `npm audit`; `bcryptjs` es JS puro, misma API, cero dependencias
  nativas, sin ese riesgo.
- **JWT**: access token (15m) y refresh token (7d) son JWT separados
  (mismo `JWT_SECRET`, distinguidos por un claim `type: 'access' | 'refresh'`
  para que uno no pueda usarse como el otro), firmados con `jsonwebtoken`. El
  refresh token vive en una cookie `httpOnly`, `SameSite=Lax`, `Secure` en
  producción, con `path` acotado a `/api/auth`.
- **Timing attack / user enumeration en login**: `LoginUserUseCase` siempre
  ejecuta un `bcrypt.compare`, ya sea contra el hash real del usuario o
  contra un hash dummy precomputado (mismo costo) si el email no existe, así
  el tiempo de respuesta no delata si la cuenta existe. El mensaje de error
  es genérico en ambos casos.
- **Autorización por dueño de recurso**: los casos de uso de metric-entries,
  activities (vía `categoryId`) y fixed-routines (`DELETE`) verifican que el
  recurso referenciado pertenezca al usuario autenticado antes de operar; si
  no, devuelven `404` (no `403`) para no filtrar la existencia del recurso.
- **SQL injection**: todas las queries usan placeholders `?` de `mysql2`,
  cero concatenación de input de usuario.
- **Headers HTTP**: `helmet`.
- **CORS**: restringido a `CORS_ORIGIN` con `credentials: true` (necesario
  para la cookie de refresh).
- **Rate limiting**: limiter global (300 req/15min por IP) + limiter estricto
  en `/api/auth/*` (10 req/15min por IP) contra brute-force/DDoS.
- **Payloads**: `express.json({ limit: '10kb' })`.
- **Timeouts**: `connect-timeout` (10s) para no acumular conexiones colgadas
  bajo carga.
- **Errores**: en `NODE_ENV=production` el handler global nunca expone stack
  traces ni mensajes internos (mensaje genérico); en dev sí loguea el detalle
  a consola.
- **Idempotencia**: todos los `POST` que crean un recurso (auth/register,
  metrics, metric-entries, activity-categories, activities, fixed-routines,
  finance/entries, finance/debt-payments, finance/savings, expenses/daily,
  expenses/fixed, weekly-log/counters) soportan header `Idempotency-Key`. Con
  el mismo key y mismo body, reintentos devuelven la respuesta original sin
  re-ejecutar el caso de uso (evita duplicados por timeout/reconexión del
  cliente). Mismo key con body distinto → `409 Conflict`.
- **Validación de inputs**: `zod` en un middleware reusable
  (`validateBody`), aplicado en todos los dominios de arriba.

## Variables de entorno

Ver `.env.example`. Nunca commitear el valor real de `JWT_SECRET`.

- `DB_POOL_LIMIT` — tamaño del pool de conexiones mysql2 (default 10),
  ajustable en prod sin tocar código.
- `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` — duración de access/refresh
  token (formato `Nm`/`Nh`/`Nd`, ej. `15m`, `7d`).
- `CORS_ORIGIN` — origen permitido para CORS (debe coincidir con el front).
