# samarya — vitalis API

API de **vitalis**, app personal de auto-seguimiento (peso, hábitos, métricas custom).
Node.js + TypeScript, Clean Architecture + SOLID, MySQL.

## Arquitectura

```
src/
  domain/           # Entidades y contratos de repositorio (sin dependencias externas)
  application/      # Casos de uso — orquestan el dominio, dependen de abstracciones
  infrastructure/   # MySQL, Express, config — implementaciones concretas
  presentation/      # Controllers, rutas y middlewares HTTP
  main/             # Composition root — arma las dependencias e inicia el servidor
```

La regla de dependencia se respeta de afuera hacia adentro: `presentation` e
`infrastructure` dependen de `application`/`domain`, nunca al revés.

## Levantar en local

```bash
cp .env.example .env
docker compose up -d        # levanta MySQL con el schema inicial
npm install
npm run dev                 # http://localhost:4000
```

## Endpoints

- `POST /api/metrics` — crear una métrica (`{ name, unit }`)
- `GET /api/metrics` — listar métricas
- `POST /api/metric-entries` — registrar una medición (`{ metricId, value, note? }`)
- `GET /api/metric-entries/:metricId` — historial de una métrica
