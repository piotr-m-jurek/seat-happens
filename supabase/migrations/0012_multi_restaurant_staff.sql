-- Staff.id was auth.users.id itself, so one person could only ever have a
-- single staff row in the whole system — inviting the same person as owner
-- of a second restaurant silently no-op'd via `on conflict (id) do nothing`
-- in redeem_staff_invite(), leaving the second restaurant with zero staff.
-- Fix: staff becomes (surrogate id, user_id, restaurant_id) with a unique
-- constraint on (user_id, restaurant_id) — one person, many restaurants.

-- reservations.created_by (uuid references staff(id)) is unused by the app
-- (confirmed via grep) and FKs to the column staff's PK is about to move
-- off of, so drop it first rather than migrate it to the new bigint id.
alter table reservations drop column created_by;

-- All of these are recreated below against staff.user_id instead of staff.id.
drop policy "floor_plan select" on floor_plan;
drop policy "floor_plan insert" on floor_plan;
drop policy "floor_plan update" on floor_plan;
drop policy "floor_plan delete" on floor_plan;
drop policy "obstacles select" on obstacles;
drop policy "obstacles insert" on obstacles;
drop policy "obstacles update" on obstacles;
drop policy "obstacles delete" on obstacles;
drop policy "reservations select" on reservations;
drop policy "reservations insert" on reservations;
drop policy "reservations update" on reservations;
drop policy "reservations delete" on reservations;
drop policy "tables select" on tables;
drop policy "tables insert" on tables;
drop policy "tables update" on tables;
drop policy "tables delete" on tables;
drop policy "restaurants select" on restaurants;
drop policy "staff_invites select" on staff_invites;
drop policy "staff_invites insert" on staff_invites;
drop policy "staff_invites delete" on staff_invites;
drop policy "staff select" on staff;
drop policy "staff insert" on staff;
drop policy "staff update" on staff;
drop policy "staff delete" on staff;

drop function redeem_staff_invite();
drop function private.is_restaurant_owner(bigint);

-- staff_id_fkey (staff.id -> auth.users.id) and staff_restaurant_id_fkey
-- follow the rename automatically and stay correct.
alter table staff rename column id to user_id;
alter table staff drop constraint staff_pkey;
alter table staff add column id bigint generated always as identity primary key;
alter table staff add constraint staff_user_restaurant_unique unique (user_id, restaurant_id);

create function private.is_restaurant_owner(target_restaurant_id bigint) returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.staff
    where staff.user_id = (select auth.uid())
      and staff.restaurant_id = target_restaurant_id
      and staff.role = 'owner'
      and staff.active
  );
$$;

revoke execute on function private.is_restaurant_owner(bigint) from public, anon;
grant execute on function private.is_restaurant_owner(bigint) to authenticated;

-- Conflict target changes from (id) to (user_id, restaurant_id) — this is
-- the actual fix: the same person redeeming an invite for a DIFFERENT
-- restaurant now inserts a new staff row instead of silently no-op'ing.
create function redeem_staff_invite() returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  my_email text := (select email from auth.users where id = auth.uid());
  invite record;
begin
  select * into invite from public.staff_invites where email = my_email limit 1;
  if invite is not null then
    insert into public.staff (user_id, restaurant_id, email, role, active)
    values (auth.uid(), invite.restaurant_id, my_email, invite.role, true)
    on conflict (user_id, restaurant_id) do nothing;
    delete from public.staff_invites where id = invite.id;
  end if;
end;
$$;

revoke execute on function redeem_staff_invite() from public, anon;
grant execute on function redeem_staff_invite() to authenticated;

create policy "staff select"
  on staff for select
  to authenticated
  using (user_id = (select auth.uid()) or private.is_restaurant_owner(staff.restaurant_id));

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

create policy "restaurants select"
  on restaurants for select
  to authenticated
  using (
    exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = restaurants.id and staff.active)
    or exists (select 1 from super_admins where super_admins.id = (select auth.uid()))
  );

create policy "staff_invites select"
  on staff_invites for select
  to authenticated
  using (
    exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = staff_invites.restaurant_id and staff.role = 'owner' and staff.active)
    or exists (select 1 from super_admins where super_admins.id = (select auth.uid()))
  );

create policy "staff_invites insert"
  on staff_invites for insert
  to authenticated
  with check (
    exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = staff_invites.restaurant_id and staff.role = 'owner' and staff.active)
    or exists (select 1 from super_admins where super_admins.id = (select auth.uid()))
  );

create policy "staff_invites delete"
  on staff_invites for delete
  to authenticated
  using (
    exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = staff_invites.restaurant_id and staff.role = 'owner' and staff.active)
    or exists (select 1 from super_admins where super_admins.id = (select auth.uid()))
  );

create policy "tables select"
  on tables for select
  to authenticated
  using (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = tables.restaurant_id and staff.active));
create policy "tables insert"
  on tables for insert
  to authenticated
  with check (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = tables.restaurant_id and staff.active and staff.role != 'viewer'));
create policy "tables update"
  on tables for update
  to authenticated
  using (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = tables.restaurant_id and staff.active and staff.role != 'viewer'))
  with check (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = tables.restaurant_id and staff.active and staff.role != 'viewer'));
create policy "tables delete"
  on tables for delete
  to authenticated
  using (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = tables.restaurant_id and staff.active and staff.role != 'viewer'));

create policy "obstacles select"
  on obstacles for select
  to authenticated
  using (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = obstacles.restaurant_id and staff.active));
create policy "obstacles insert"
  on obstacles for insert
  to authenticated
  with check (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = obstacles.restaurant_id and staff.active and staff.role != 'viewer'));
create policy "obstacles update"
  on obstacles for update
  to authenticated
  using (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = obstacles.restaurant_id and staff.active and staff.role != 'viewer'))
  with check (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = obstacles.restaurant_id and staff.active and staff.role != 'viewer'));
create policy "obstacles delete"
  on obstacles for delete
  to authenticated
  using (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = obstacles.restaurant_id and staff.active and staff.role != 'viewer'));

create policy "reservations select"
  on reservations for select
  to authenticated
  using (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = reservations.restaurant_id and staff.active));
create policy "reservations insert"
  on reservations for insert
  to authenticated
  with check (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = reservations.restaurant_id and staff.active and staff.role != 'viewer'));
create policy "reservations update"
  on reservations for update
  to authenticated
  using (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = reservations.restaurant_id and staff.active and staff.role != 'viewer'))
  with check (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = reservations.restaurant_id and staff.active and staff.role != 'viewer'));
create policy "reservations delete"
  on reservations for delete
  to authenticated
  using (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = reservations.restaurant_id and staff.active and staff.role != 'viewer'));

create policy "floor_plan select"
  on floor_plan for select
  to authenticated
  using (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = floor_plan.restaurant_id and staff.active));
create policy "floor_plan insert"
  on floor_plan for insert
  to authenticated
  with check (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = floor_plan.restaurant_id and staff.active and staff.role != 'viewer'));
create policy "floor_plan update"
  on floor_plan for update
  to authenticated
  using (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = floor_plan.restaurant_id and staff.active and staff.role != 'viewer'))
  with check (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = floor_plan.restaurant_id and staff.active and staff.role != 'viewer'));
create policy "floor_plan delete"
  on floor_plan for delete
  to authenticated
  using (exists (select 1 from staff where staff.user_id = (select auth.uid()) and staff.restaurant_id = floor_plan.restaurant_id and staff.active and staff.role != 'viewer'));
