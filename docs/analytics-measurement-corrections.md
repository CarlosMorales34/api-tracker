# Personal analytics measurement corrections

## Deployment

Deploy the API and frontend together. The analytics response adds sleep secondary
blocks, daily work metrics, weekly training dates, measurement age and comparison
evidence. Daily timeline values can now be null when no duration is recorded.
The updated frontend requires these response fields.

The original measurement correction required no migration. The subsequent
exercise identity feature requires migration 038 before deploying this version.
Existing activity_suggestions and
suggestion_feedback tables from migration 033 must already exist. The change
does not overwrite, merge or delete historical records.

## Measurement rules

- Sleep uses fixed_routines.is_sleep. BI and the routine detector select the
  longest completed block per recorded date as principal; other blocks stay
  separate. This is a documented fallback, not a verified sleep/nap diagnosis.
  Clock medians use the shared circular-clock helpers. Equal start/end times
  count as zero rather than 24 hours.
- Work includes linked programming, deduplicates exact routine/activity mirrors,
  and unions overlapping intervals per recorded date. Daily first-start and
  last-end medians describe a span with pauses, not continuous work.
- Activity totals derive from intervals when present and retain manual duration
  only for logs without intervals. Category attribution can include simultaneous
  activity; the daily timeline counts interval union instead of summing labels.
- Training frequency counts distinct dates; multiple sessions remain visible.
  Zero durations are unknown and do not enter mean session duration. Weekly
  totals flag ranges that do not contain the whole Monday-Sunday week.
- Weight shows the most recent observation on/before the selected cutoff and
  its age. Up to two pre-range observations provide comparison context, but
  measurementCount counts only observations in the range. Two points are not
  classified as a sustained favorable/unfavorable trend.
- Equivalent preceding periods provide sleep comparisons only when both have
  at least seven recorded dates. Sample counts stay visible; incomplete
  observation is not interpreted as inactivity.
- Feedback compares proposed values rather than operational fields such as
  logDate. Recording metadata is retained even for an unchanged acceptance.
  Legacy false corrections are ignored when learning clock-time corrections;
  genuine recent time changes are read newest first.
- Suggestion schedule confidence no longer increases from acceptance counts.
  Routine habit eligibility remains separate from variable clock-time evidence.
  Acceptance dates are disclosed as data-quality context, not independent proof
  that a proposed schedule was performed.

## Validation

Regression coverage includes midnight, secondary sleep, unknown dates, mirrored
work intervals, simultaneous activities, daily spans, duplicate training dates,
unknown session duration, sparse weight data and feedback metadata.

Read-only verification compared the API aggregates with an offline extraction
from a local dump. Personal measurements are not included in this deployment
document. Browser checks use mocked authentication and requests, so they do
not access a user's real session or mutate their data.

## Remaining boundaries

Recorded-date semantics are preserved; no historical sleep dates are shifted.
Sleep quality, income generated, muscle growth and causal relationships are
not inferred. A complete multi-block proposal for daily routine capture is a
separate extension of the current single-block suggestion contract; BI now
shows the morning/afternoon/night groups without claiming that their medians
are an exact daily schedule. Historical suggestion statuses are not rewritten.
