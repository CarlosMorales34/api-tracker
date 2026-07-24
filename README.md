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

Todos los endpoints (auth, metrics, metric-entries) están documentados con
anotaciones `@openapi` en sus archivos de rutas (`src/presentation/routes/*.ts`),
incluyendo requestBody/response schemas, códigos de error, el header
`Idempotency-Key` donde aplica y `Authorization: Bearer` donde aplica.

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
- **Autorización por dueño de recurso**: los casos de uso de metric-entries
  verifican que el `metricId` pertenezca al usuario autenticado antes de
  operar; si no, devuelven `404` (no `403`) para no filtrar la existencia del
  recurso.
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
- **Idempotencia**: `POST /api/auth/register`, `POST /api/metrics` y
  `POST /api/metric-entries` soportan header `Idempotency-Key`. Con el mismo
  key y mismo body, reintentos devuelven la respuesta original sin re-ejecutar
  el caso de uso (evita duplicados por timeout/reconexión del cliente). Mismo
  key con body distinto → `409 Conflict`.
- **Validación de inputs**: `zod` en un middleware reusable
  (`validateBody`), aplicado en auth, metrics y metric-entries.

## Variables de entorno

Ver `.env.example`. Nunca commitear el valor real de `JWT_SECRET`.

- `DB_POOL_LIMIT` — tamaño del pool de conexiones mysql2 (default 10),
  ajustable en prod sin tocar código.
- `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` — duración de access/refresh
  token (formato `Nm`/`Nh`/`Nd`, ej. `15m`, `7d`).
- `CORS_ORIGIN` — origen permitido para CORS (debe coincidir con el front).
