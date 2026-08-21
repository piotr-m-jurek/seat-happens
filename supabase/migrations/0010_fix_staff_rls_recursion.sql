-- The "staff select/insert/update/delete" policies from 0009 subquery
-- `staff` from within a policy defined ON `staff` — Postgres detects this
-- as infinite recursion (42P17) and every query touching `staff`, directly
-- or via any other table's policy that checks staff membership, fails.
-- Confirmed via a simulated authenticated request:
--   ERROR: 42P17: infinite recursion detected in policy for relation "staff"
--
-- Fix: a SECURITY DEFINER helper function. Its body runs with the
-- function owner's privileges (bypassrls), so its internal query against
-- `staff` does not re-trigger `staff`'s own RLS policy — breaking the
-- recursive cycle. Kept in a `private` schema so it isn't a public RPC
-- endpoint; only used from inside other tables' policies.
create schema if not exists private;

create function private.is_restaurant_owner(target_restaurant_id bigint) returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.staff
    where staff.id = (select auth.uid())
      and staff.restaurant_id = target_restaurant_id
      and staff.role = 'owner'
      and staff.active
  );
$$;

revoke execute on function private.is_restaurant_owner(bigint) from public, anon;
grant execute on function private.is_restaurant_owner(bigint) to authenticated;

drop policy "staff select" on staff;
drop policy "staff insert" on staff;
drop policy "staff update" on staff;
drop policy "staff delete" on staff;

create policy "staff select"
  on staff for select
  to authenticated
  using (id = (select auth.uid()) or private.is_restaurant_owner(staff.restaurant_id));

create policy "staff insert"
  on staff for insert
  to authenticated
  with check (private.is_restaurant_owner(staff.restaurant_id));

create policy "staff update"
  on staff for update
  to authenticated
  using (private.is_restaurant_owner(staff.restaurant_id))
  with check (private.is_restaurant_owner(staff.restaurant_id));

create policy "staff delete"
  on staff for delete
  to authenticated
  using (private.is_restaurant_owner(staff.restaurant_id));
