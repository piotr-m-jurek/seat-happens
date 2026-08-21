-- "for all" already covers select with the identical predicate, so the
-- standalone select policies were redundant duplicate-permissive-policy
-- overhead on every read (flagged by `supabase db advisors`).
drop policy "active staff can read tables" on tables;
drop policy "active staff can read reservations" on reservations;
