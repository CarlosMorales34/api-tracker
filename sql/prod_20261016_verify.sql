-- Read-only. Run AFTER migration 038 and before deploying API/frontend.
USE vitalist;

-- Each error count must be zero.
SELECT 'unlinked_workout_exercises' AS check_name, COUNT(*) AS error_count
FROM workout_exercises WHERE TRIM(name) <> '' AND exercise_id IS NULL
UNION ALL
SELECT 'unlinked_routine_exercises', COUNT(*)
FROM workout_routine_exercises WHERE TRIM(name) <> '' AND exercise_id IS NULL
UNION ALL
SELECT 'workout_exercise_wrong_owner', COUNT(*)
FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id
LEFT JOIN exercise_catalog ec ON ec.id = we.exercise_id
WHERE we.exercise_id IS NOT NULL AND (ec.id IS NULL OR ec.user_id <> w.user_id)
UNION ALL
SELECT 'routine_exercise_wrong_owner', COUNT(*)
FROM workout_routine_exercises wre JOIN workout_routines wr ON wr.id = wre.routine_id
LEFT JOIN exercise_catalog ec ON ec.id = wre.exercise_id
WHERE wre.exercise_id IS NOT NULL AND (ec.id IS NULL OR ec.user_id <> wr.user_id)
UNION ALL
SELECT 'catalog_name_without_alias', COUNT(*)
FROM exercise_catalog ec LEFT JOIN exercise_aliases ea
  ON ea.user_id = ec.user_id AND ea.exercise_id = ec.id AND ea.normalized_name = ec.normalized_name
WHERE ea.exercise_id IS NULL
UNION ALL
SELECT 'invalid_alias_owner', COUNT(*)
FROM exercise_aliases ea LEFT JOIN exercise_catalog ec ON ec.id = ea.exercise_id
WHERE ec.id IS NULL OR ec.user_id <> ea.user_id
UNION ALL
SELECT 'invalid_routine_weekdays', COUNT(*) FROM workout_routines
WHERE weekdays IS NOT NULL AND JSON_TYPE(weekdays) <> 'ARRAY'
UNION ALL
SELECT 'legacy_weekday_not_copied', COUNT(*) FROM workout_routines
WHERE weekday IS NOT NULL AND
  (weekdays IS NULL OR JSON_CONTAINS(weekdays, CAST(weekday AS CHAR)) = 0);

-- Compare against preflight: no training or exercise rows should be removed.
SELECT 'workouts' AS object_name, COUNT(*) AS row_count FROM workouts
UNION ALL SELECT 'workout_exercises', COUNT(*) FROM workout_exercises
UNION ALL SELECT 'workout_routines', COUNT(*) FROM workout_routines
UNION ALL SELECT 'workout_routine_exercises', COUNT(*) FROM workout_routine_exercises;

SELECT 'exercise_catalog' AS object_name, COUNT(*) AS row_count FROM exercise_catalog
UNION ALL SELECT 'exercise_aliases', COUNT(*) FROM exercise_aliases;
