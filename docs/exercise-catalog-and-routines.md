# Exercise identity and weekly training templates

## Deployment

1. Back up the target database and select the correct schema. Production is
   `vitalist`; the local development schema may be `vitalis`.
2. Execute `sql/038_exercise_catalog_and_routine_days.sql` once. It has no USE
   directive and operates only on the selected schema. Requires MariaDB 10.6
   or MySQL 8 with REGEXP_REPLACE support.
3. Deploy the API and frontend. Workout persistence and analytics now use the
   catalog joins, so deploy the migration before the code.

Migration seeds a personal catalog from existing workout and routine names,
links existing rows to stable IDs and copies single weekdays into the new
weekdays array. It does not merge synonyms, remove sessions, change dates,
convert units or alter weight/sets/reps/bodyweight metadata.

SQL migration copies live in sql/ and the existing infrastructure migrations
directory. Only these specific new files are exempted from the dump ignore rule.

## Behavior

Each user owns a catalog of stable exercise IDs. Workout and routine rows use
exercise_id; their original name column remains available as historical data.
Reads display the current catalog name, including the progression graphs and BI.

The exercise picker chooses an existing identity or explicitly creates a new
exercise. Legacy API callers can still send names: cosmetic case, accents and
whitespace resolve via the personal alias key. Different movement variants are
not matched by edit distance or automatically merged.

The catalog editor can rename an exercise and explicitly merge two identities.
Merging moves session/routine references and aliases inside one transaction;
all rows and their measurements remain intact. Both IDs must belong to the
authenticated user. Old aliases resolve to the surviving identity. Recovering
old frontend drafts also resolves retained aliases before saving.

Name families such as Martillos/Curl martillo and Pantorrilla/Pantorrillas are
review candidates only. The UI asks whether they represent the same exercise
and variant before submitting a merge.

Routine templates expose the user's chosen distribution:

| Routine | Usual weekdays |
| --- | --- |
| Pecho, hombros y biceps | Monday, Thursday |
| Pierna | Tuesday, Friday |
| Espalda y triceps | Wednesday, Saturday |

Templates preselect possible exercises by recorded names for review. Sets/reps
remain editable; no template is persisted without saving. Days are selectable
checkboxes, not restrictions: any routine can be chosen on another date.
Health summary and capture suggestions honor all routine weekdays.

No personal historical merge or routine creation was executed as part of
development. Users review equivalences and save their selected templates in
the UI after deploying the migration.

## Verification

`./node_modules/.bin/tsx scripts/verify-exercise-catalog.ts` creates and cleans
an isolated fixture database. It verifies migration/backfill, whitespace
normalization, alias resolution after merge/rename, foreign-user rejection,
preservation of weights/reps and multi-day routine persistence.

Browser verification mocks authentication and API responses and checks the
merge confirmation, Monday/Thursday template, canonical exercise selection,
manual routine use on a different weekday and desktop/mobile layout.
