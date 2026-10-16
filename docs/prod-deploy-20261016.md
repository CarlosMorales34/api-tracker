# Produccion: analytics y catalogo de ejercicios

La base del ultimo dump proporcionado se llama `vitalist`. No se ha ejecutado
ninguna consulta de escritura sobre produccion desde este trabajo.

## Orden de ejecucion

1. Obtener un respaldo y pausar temporalmente los registros de entrenamiento
   durante la migracion para que no aparezcan filas nuevas entre backfill y
   despliegue. Los ALTER TABLE pueden bloquear escrituras.
2. Ejecutar `sql/prod_20261016_preflight.sql` en la base de produccion.
   Las consultas de prerrequisitos deben devolver cero filas. Si faltan tablas
   o columnas, detenerse: no ejecutar todos los SQL antiguos sobre produccion.
3. Si el estado es PENDIENTE, seleccionar `vitalist` y ejecutar una sola vez
   **todo** `sql/038_exercise_catalog_and_routine_days.sql`. Contiene todos los
   CREATE, ALTER, INSERT y UPDATE requeridos para esta entrega.
4. Ejecutar `sql/prod_20261016_verify.sql`. Cada `error_count` debe ser cero;
   los conteos de sesiones y ejercicios deben coincidir con el preflight.
5. Desplegar/reiniciar API y frontend de esta entrega, y reanudar los registros.

Si el preflight muestra ESTRUCTURA PRESENTE, no repetir 038: ejecutar la
verificacion. Si muestra PARCIAL o aparecen errores, revisar el resultado de
la aplicacion anterior antes de continuar. El script 038 no es idempotente;
MariaDB confirma las operaciones DDL implicitamente, de modo que envolver
todo el script en una transaccion no deshace un fallo de CREATE/ALTER.

## Cliente mysql desde la raiz del repositorio

Con las credenciales habituales de produccion:

```bash
mysql -h HOST -u USUARIO -p vitalist < sql/prod_20261016_preflight.sql
# Revisar los resultados antes de continuar.
mysql -h HOST -u USUARIO -p vitalist < sql/038_exercise_catalog_and_routine_days.sql
mysql -h HOST -u USUARIO -p vitalist < sql/prod_20261016_verify.sql
```

En phpMyAdmin seleccionar `vitalist` e importar los mismos archivos en ese
orden, revisando el resultado de cada paso. No importar ambas copias de 038;
la copia de infrastructure/migrations es para inicializar entornos aislados.

## Que cambia en la base

- Dos tablas: exercise_catalog y exercise_aliases, aisladas por usuario.
- exercise_id en workout_exercises y workout_routine_exercises, con indices
  y claves foraneas.
- weekdays en workout_routines, precargado desde el weekday existente.
- Catalogo inicial y enlaces de ejercicios historicos. Los nombres similares
  no se fusionan automaticamente; la equivalencia se confirma en la interfaz.

Los cambios de mediciones BI, feedback, medianoche y seleccion de sueno
principal funcionan en codigo y no requieren otros UPDATE de datos. No hay
que borrar ni corregir a mano suggestion_feedback, ni renombrar ejercicios
mediante consultas sueltas. Las tres distribuciones semanales son plantillas
editables de la interfaz y se guardan al confirmarlas.
