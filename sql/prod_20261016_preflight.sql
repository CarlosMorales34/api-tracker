-- Read-only. Run before migration 038. Select the production schema explicitly.
USE vitalist;
SELECT DATABASE() AS selected_database, VERSION() AS server_version;

-- Expect no rows. Missing objects are older prerequisites, not migration 038.
SELECT required.table_name AS missing_prerequisite_table
FROM (
  SELECT 'users' AS table_name UNION ALL SELECT 'workouts'
  UNION ALL SELECT 'workout_exercises' UNION ALL SELECT 'workout_routines'
  UNION ALL SELECT 'workout_routine_exercises' UNION ALL SELECT 'fixed_routines'
  UNION ALL SELECT 'routine_logs' UNION ALL SELECT 'routine_log_times'
  UNION ALL SELECT 'activity_logs' UNION ALL SELECT 'activity_log_times'
  UNION ALL SELECT 'activity_suggestions' UNION ALL SELECT 'suggestion_feedback'
  UNION ALL SELECT 'user_suggestion_settings' UNION ALL SELECT 'body_measurements'
  UNION ALL SELECT 'body_goals'
) required
LEFT JOIN information_schema.tables existing
  ON existing.table_schema = DATABASE() AND existing.table_name = required.table_name
WHERE existing.table_name IS NULL;

-- Expect no rows. These columns already exist in the latest provided dump.
SELECT required.table_name, required.column_name AS missing_prerequisite_column
FROM (
  SELECT 'fixed_routines' AS table_name, 'is_sleep' AS column_name
  UNION ALL SELECT 'workout_exercises', 'is_bodyweight'
  UNION ALL SELECT 'workout_routine_exercises', 'is_bodyweight'
  UNION ALL SELECT 'workouts', 'source_routine_id'
  UNION ALL SELECT 'workout_routines', 'weekday'
) required
LEFT JOIN information_schema.columns existing
  ON existing.table_schema = DATABASE() AND existing.table_name = required.table_name
  AND existing.column_name = required.column_name
WHERE existing.column_name IS NULL;

SELECT new_tables, new_columns,
  CASE
    WHEN new_tables = 0 AND new_columns = 0 THEN 'PENDIENTE: ejecutar 038 una vez'
    WHEN new_tables = 2 AND new_columns = 3 THEN 'ESTRUCTURA PRESENTE: no repetir 038; ejecutar verificaciones'
    ELSE 'PARCIAL: revisar antes de ejecutar 038'
  END AS migration_038_status
FROM (
  SELECT
    (SELECT COUNT(*) FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name IN ('exercise_catalog', 'exercise_aliases')) AS new_tables,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE()
      AND ((table_name = 'workout_exercises' AND column_name = 'exercise_id')
        OR (table_name = 'workout_routine_exercises' AND column_name = 'exercise_id')
        OR (table_name = 'workout_routines' AND column_name = 'weekdays'))) AS new_columns
) migration_state;

-- Save these counts to compare after migration. They must remain unchanged.
SELECT 'workouts' AS object_name, COUNT(*) AS row_count FROM workouts
UNION ALL SELECT 'workout_exercises', COUNT(*) FROM workout_exercises
UNION ALL SELECT 'workout_routines', COUNT(*) FROM workout_routines
UNION ALL SELECT 'workout_routine_exercises', COUNT(*) FROM workout_routine_exercises;
