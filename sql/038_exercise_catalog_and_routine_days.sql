-- Apply once before deploying the exercise catalog API.
CREATE TABLE exercise_catalog (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_exercise_user_name (user_id, normalized_name),
  UNIQUE KEY uq_exercise_owner (id, user_id),
  CONSTRAINT fk_exercise_catalog_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE exercise_aliases (
  user_id CHAR(36) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  exercise_id CHAR(36) NOT NULL,
  PRIMARY KEY (user_id, normalized_name),
  CONSTRAINT fk_exercise_alias_owner FOREIGN KEY (exercise_id, user_id)
    REFERENCES exercise_catalog(id, user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE workout_exercises ADD COLUMN exercise_id CHAR(36) NULL,
  ADD KEY idx_workout_exercise_catalog (exercise_id),
  ADD CONSTRAINT fk_workout_exercise_catalog FOREIGN KEY (exercise_id) REFERENCES exercise_catalog(id);
ALTER TABLE workout_routine_exercises ADD COLUMN exercise_id CHAR(36) NULL,
  ADD KEY idx_routine_exercise_catalog (exercise_id),
  ADD CONSTRAINT fk_routine_exercise_catalog FOREIGN KEY (exercise_id) REFERENCES exercise_catalog(id);
ALTER TABLE workout_routines ADD COLUMN weekdays JSON NULL;

-- Preserve all original session rows and numbers. Only cosmetic name differences
-- resolve automatically; synonyms/variants require an explicit user merge.
INSERT INTO exercise_catalog (id, user_id, name, normalized_name)
SELECT UUID(), user_id, MIN(name), normalized_name FROM (
  SELECT w.user_id, TRIM(REGEXP_REPLACE(we.name, '[[:space:]]+', ' ')) AS name,
    LOWER(TRIM(REGEXP_REPLACE(we.name, '[[:space:]]+', ' '))) AS normalized_name
  FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id
  WHERE TRIM(we.name) <> ''
  UNION ALL
  SELECT wr.user_id, TRIM(REGEXP_REPLACE(wre.name, '[[:space:]]+', ' ')), LOWER(TRIM(REGEXP_REPLACE(wre.name, '[[:space:]]+', ' ')))
  FROM workout_routine_exercises wre JOIN workout_routines wr ON wr.id = wre.routine_id
  WHERE TRIM(wre.name) <> ''
) existing_names GROUP BY user_id, normalized_name;

INSERT INTO exercise_aliases (user_id, normalized_name, exercise_id)
SELECT user_id, normalized_name, id FROM exercise_catalog;

UPDATE workout_exercises we JOIN workouts w ON w.id = we.workout_id
JOIN exercise_catalog ec ON ec.user_id = w.user_id
  AND ec.normalized_name = LOWER(TRIM(REGEXP_REPLACE(we.name, '[[:space:]]+', ' ')))
SET we.exercise_id = ec.id;
UPDATE workout_routine_exercises wre JOIN workout_routines wr ON wr.id = wre.routine_id
JOIN exercise_catalog ec ON ec.user_id = wr.user_id
  AND ec.normalized_name = LOWER(TRIM(REGEXP_REPLACE(wre.name, '[[:space:]]+', ' ')))
SET wre.exercise_id = ec.id;
UPDATE workout_routines SET weekdays = JSON_ARRAY(weekday) WHERE weekday IS NOT NULL;
