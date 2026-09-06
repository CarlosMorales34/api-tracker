# Personal BI extraction plan

Usuario analizado: `carlos.mrojas@alumnos.udg.mx` (`f86b2630-9bc8-4717-856f-899f4fa37b30`).

## Hallazgos actuales

- El modelo fuente esta listo para un BI personal: actividades/categorias, tramos horarios, rutinas fijas, entrenamientos, ejercicios, mediciones corporales y metas.
- Hay una inconsistencia importante: la rutina `Dormir` existe, pero `fixed_routines.is_sleep = 0`. Mientras siga asi, los indicadores que dependen de sueno no la reconocen como sueno.
- `weight_entries` quedo como modelo legado. Para BI conviene usar `body_measurements` y `body_goals`.
- El frontend consume endpoints operativos por pantalla. Aun falta una capa de endpoints analiticos que agregue por rango, frecuencia, tendencia y recomendacion.

## Snapshot del usuario

Datos consultados el 2026-09-05:

- Actividades: 97 registros diarios, del 2026-07-18 al 2026-09-05, 335.84 h.
- Tramos de actividad: 114 tramos, del 2026-07-28 al 2026-09-05, 326.10 h.
- Rutinas fijas: 99 tramos, del 2026-07-24 al 2026-09-05, 563.78 h.
- Entrenamientos: 9 sesiones, del 2026-07-18 al 2026-08-11, 7.83 h totales, promedio 52.2 min.
- Progreso corporal: 28 mediciones, del 2023-01-01 al 2026-08-01.

Distribucion por categoria:

- Crecimiento Personal: 215.73 h, 32 dias activos, 6.74 h/dia activo.
- Recreacion: 82.86 h, 31 dias activos, 2.67 h/dia activo.
- Estudios: 29.75 h, 18 dias activos, 1.65 h/dia activo.
- Proyecto personal: 7.50 h, 7 dias activos, 1.07 h/dia activo.
- Aporte al mundo: categoria creada sin registros.

Sueño calculado por la rutina `Dormir`:

- 44 tramos en 43 dias.
- Hora mediana de dormir: 23:00.
- Hora mediana de despertar: 07:15.
- Duracion media: 7.62 h.
- Duracion mediana: 8.00 h.
- Promedio mas bajo por dia de semana: domingo 6.63 h y lunes 6.24 h.

Trabajo calculado por la rutina `Trabajo`:

- 54 tramos en 32 dias.
- Inicio mediano: 09:45.
- Fin mediano: 15:00.
- Duracion media por tramo: 4.23 h.
- Mayor volumen observado: viernes 55 h acumuladas, miercoles 47 h, martes 43.5 h.

Peso/meta:

- Meta activa: subir (`gain`) de 60.55 kg a 70.00 kg.
- Ultima medicion: 60.00 kg el 2026-08-01.
- Distancia a meta: 10.00 kg.
- Cambio vs mes anterior: -1.55 kg.
- Promedio de los ultimos 3 registros: 60.52 kg.
- Promedio de los 3 registros previos: 62.52 kg.
- Tendencia reciente: -2.00 kg, contraria al objetivo de subir.

## Data marts propuestos

### 1. `bi_sleep_daily`

Grano: 1 fila por usuario y fecha.

Campos:

- `user_id`
- `log_date`
- `sleep_start_time`
- `sleep_end_time`
- `sleep_hours`
- `bedtime_minutes`
- `wake_minutes`
- `crosses_midnight`
- `weekday`
- `is_short_sleep` (`sleep_hours < 7`)
- `is_long_sleep` (`sleep_hours > 9`)
- `bedtime_deviation_minutes` contra mediana movil de 14/30 dias
- `wake_deviation_minutes` contra mediana movil de 14/30 dias

Preguntas que responde:

- A que hora duermes y despiertas normalmente.
- Que dias duermes peor.
- Si el problema es cantidad, consistencia, hora de inicio o hora de despertar.

### 2. `bi_work_blocks`

Grano: 1 fila por bloque horario de trabajo.

Campos:

- `user_id`
- `log_date`
- `routine_id`
- `start_time`
- `end_time`
- `duration_hours`
- `weekday`
- `start_bucket_30m`
- `duration_bucket`
- `block_position_in_day`

Preguntas que responde:

- Cuales son tus bloques de trabajo mas frecuentes.
- Si trabajas en un bloque largo o varios bloques cortos.
- Que dias concentran mas trabajo.
- Que horarios conviene proteger para deep work.

### 3. `bi_activity_distribution_daily`

Grano: 1 fila por usuario, fecha, categoria y actividad.

Campos:

- `user_id`
- `log_date`
- `category_id`
- `category_name`
- `activity_id`
- `activity_name`
- `hours`
- `manual_hours`
- `routine_hours`
- `active_day_flag`
- `weekday`
- `week_start_date`
- `month`

Preguntas que responde:

- Como distribuyes tu tiempo por categoria.
- Frecuencia de cada actividad.
- Actividades de alto volumen pero baja frecuencia.
- Categorias abandonadas o sobreconcentradas.

### 4. `bi_workout_sessions`

Grano: 1 fila por entrenamiento.

Campos:

- `user_id`
- `workout_id`
- `workout_date`
- `weekday`
- `duration_minutes`
- `source_routine_id`
- `exercise_count`
- `total_sets`
- `total_reps`
- `total_volume`
- `comments`

Preguntas que responde:

- Frecuencia real de entrenamiento.
- Dias preferidos.
- Duracion promedio.
- Tendencia de volumen.
- Semanas sin entrenar.

### 5. `bi_workout_exercise_progress`

Grano: 1 fila por ejercicio en una sesion.

Campos:

- `user_id`
- `workout_date`
- `exercise_name`
- `weight`
- `sets`
- `total_reps`
- `estimated_volume`
- `best_weight_to_date`
- `best_volume_to_date`

Preguntas que responde:

- Ejercicios con progreso, estancamiento o abandono.
- Que movimientos se repiten suficiente para medir avance.
- Si sube peso, reps o volumen.

### 6. `bi_body_progress_monthly`

Grano: 1 fila por medicion corporal, con ventanas moviles.

Campos:

- `user_id`
- `measured_at`
- `weight_kg`
- `body_fat_percentage`
- `waist_cm`
- `goal_type`
- `target_weight_kg`
- `distance_to_target_kg`
- `delta_vs_previous_kg`
- `rolling_3_measurement_avg_kg`
- `trend_vs_goal`

Preguntas que responde:

- Si vas en direccion correcta contra el objetivo.
- Ritmo promedio de subida/bajada.
- Cuanto falta para la meta.
- Si faltan datos de composicion corporal para saber si el cambio fue util.

## Consultas base

### Usuario

```sql
SELECT id, email, name, created_at
FROM users
WHERE email = 'carlos.mrojas@alumnos.udg.mx'
LIMIT 1;
```

### Rutinas fijas

```sql
SELECT id, name, type, is_sleep, linked_activity_id, weekdays, start_date, end_date
FROM fixed_routines
WHERE user_id = ?
ORDER BY sort_order, created_at;
```

### Tramos de rutina

```sql
SELECT
  fr.id AS routine_id,
  fr.name AS routine_name,
  fr.is_sleep,
  rl.log_date,
  rlt.start_time,
  rlt.end_time,
  CASE
    WHEN TIME_TO_SEC(rlt.end_time) >= TIME_TO_SEC(rlt.start_time)
      THEN (TIME_TO_SEC(rlt.end_time) - TIME_TO_SEC(rlt.start_time)) / 3600
    ELSE (86400 - TIME_TO_SEC(rlt.start_time) + TIME_TO_SEC(rlt.end_time)) / 3600
  END AS duration_hours
FROM routine_log_times rlt
JOIN routine_logs rl ON rl.id = rlt.routine_log_id
JOIN fixed_routines fr ON fr.id = rl.routine_id
WHERE fr.user_id = ?
  AND rlt.end_time IS NOT NULL
ORDER BY rl.log_date, rlt.sort_order;
```

### Distribucion por categoria

```sql
SELECT
  ac.name AS category,
  ROUND(SUM(al.hours), 2) AS total_hours,
  COUNT(DISTINCT al.log_date) AS active_days,
  ROUND(SUM(al.hours) / NULLIF(COUNT(DISTINCT al.log_date), 0), 2) AS avg_hours_per_active_day,
  MIN(al.log_date) AS first_date,
  MAX(al.log_date) AS last_date
FROM activity_logs al
JOIN activities a ON a.id = al.activity_id
JOIN activity_categories ac ON ac.id = a.category_id
WHERE ac.user_id = ?
GROUP BY ac.id, ac.name
ORDER BY total_hours DESC;
```

### Tramos de actividad

```sql
SELECT
  ac.name AS category,
  a.name AS activity,
  al.log_date,
  alt.start_time,
  alt.end_time,
  alt.source,
  fr.name AS source_routine,
  CASE
    WHEN TIME_TO_SEC(alt.end_time) >= TIME_TO_SEC(alt.start_time)
      THEN (TIME_TO_SEC(alt.end_time) - TIME_TO_SEC(alt.start_time)) / 3600
    ELSE 0
  END AS duration_hours
FROM activity_log_times alt
JOIN activity_logs al ON al.id = alt.activity_log_id
JOIN activities a ON a.id = al.activity_id
JOIN activity_categories ac ON ac.id = a.category_id
LEFT JOIN fixed_routines fr ON fr.id = alt.source_routine_id
WHERE ac.user_id = ?
ORDER BY al.log_date, alt.sort_order;
```

### Entrenamientos

```sql
SELECT
  w.id AS workout_id,
  w.workout_date,
  w.duration_seconds / 60 AS duration_minutes,
  w.source_routine_id,
  we.name AS exercise_name,
  we.weight,
  we.sets,
  we.reps
FROM workouts w
LEFT JOIN workout_exercises we ON we.workout_id = w.id
WHERE w.user_id = ?
ORDER BY w.workout_date, we.sort_order;
```

### Progreso corporal

```sql
SELECT
  bm.measured_at,
  bm.weight_kg,
  bm.body_fat_percentage,
  bm.waist_cm,
  bm.chest_cm,
  bm.hips_cm,
  bg.goal_type,
  bg.start_weight_kg,
  bg.target_weight_kg,
  bg.start_date,
  bg.target_date
FROM body_measurements bm
LEFT JOIN body_goals bg
  ON bg.user_id = bm.user_id
 AND bg.is_active = TRUE
WHERE bm.user_id = ?
ORDER BY bm.measured_at;
```

## Recomendaciones de implementacion

1. Corregir calidad de datos: marcar `Dormir` como `is_sleep = TRUE`.
2. Crear un endpoint analitico inicial `GET /api/analytics/personal-summary?from=&to=` que devuelva sueño, trabajo, categorias, entrenamientos y peso en una sola respuesta.
3. Crear funciones puras en `src/shared/utils/analytics-calculations.ts` para medianas, buckets horarios, dispersion y tendencias.
4. Reutilizar los repositorios actuales, pero agregar queries optimizadas de lectura para analytics. Evitar que el frontend haga N consultas y calcule todo.
5. En el frontend, crear una vista `Insights` o `BI` con filtros `30d`, `90d`, `year`, `all`.
6. Agregar indicadores de calidad de datos: dias sin sueño, dias sin actividad, semanas sin entrenamiento, ultima medicion corporal.

## Primeras acciones para mejorar

- Sueño: mantener el bloque 23:00-07:00/07:15 como base. Revisar domingos y lunes, donde el promedio baja a 6.63 h y 6.24 h.
- Trabajo: proteger el bloque 09:45-15:00 como bloque principal. Si hay doble turno, medir interrupciones y segundo bloque por separado.
- Categorias: `Crecimiento Personal` domina el tiempo por `Programacion (GN)`. Conviene decidir si ese bloque representa trabajo/productividad real o si debe separarse de crecimiento personal para tener lecturas mas honestas.
- Entrenamientos: hay solo 9 sesiones y la ultima fue 2026-08-11. El primer indicador no debe ser rendimiento fino, sino consistencia semanal.
- Peso: objetivo de subir a 70 kg, pero el ultimo dato es 60 kg y la tendencia reciente baja. Prioridad: capturar peso semanal y, si el objetivo es masa, agregar cintura o grasa corporal para distinguir ganancia util de variacion normal.
