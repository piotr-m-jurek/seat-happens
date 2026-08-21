-- Same redundant-policy cleanup as 0002_dedupe_select_policies.sql, missed
-- here when obstacles (0004) and floor_plan (0006) were added: "for all"
-- already covers select with the identical predicate.
drop policy "active staff can read obstacles" on obstacles;
drop policy "active staff can read floor_plan" on floor_plan;
