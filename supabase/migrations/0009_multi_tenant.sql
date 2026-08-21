-- Multi-tenant: restaurants, a super-admin allowlist, and self-service
-- viewer invites. Every operational table becomes restaurant-scoped, and
-- "viewer" becomes a real read-only role for the first time — previously
-- any active staff row could write, regardless of role.

create table restaurants (
  id bigint generated always as identity primary key,
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table super_admins (
  id uuid primary key references auth.users(id) on delete cascade
);

-- Pending access grants for people who haven't logged in yet — a `staff`
-- row FKs to auth.users, so it can't be created until they exist there.
-- Redeemed automatically on next login via redeem_staff_invite().
create table staff_invites (
  id bigint generated always as identity primary key,
  email text not null,
  restaurant_id bigint not null references restaurants(id) on delete cascade,
  role text not null check (role in ('owner', 'staff', 'viewer')),
  created_at timestamptz not null default now(),
  unique (email, restaurant_id)
);

-- Backfill: one restaurant for everything that already exists, renameable
-- later via the admin page.
insert into restaurants (slug, name) values ('default', 'My Restaurant');

alter table staff add column restaurant_id bigint references restaurants(id) on delete cascade;
alter table tables add column restaurant_id bigint references restaurants(id) on delete cascade;
alter table obstacles add column restaurant_id bigint references restaurants(id) on delete cascade;
alter table reservations add column restaurant_id bigint references restaurants(id) on delete cascade;

update staff set restaurant_id = (select id from restaurants where slug = 'default');
update tables set restaurant_id = (select id from restaurants where slug = 'default');
update obstacles set restaurant_id = (select id from restaurants where slug = 'default');
update reservations set restaurant_id = (select id from restaurants where slug = 'default');

alter table staff alter column restaurant_id set not null;
alter table tables alter column restaurant_id set not null;
alter table obstacles alter column restaurant_id set not null;
alter table reservations alter column restaurant_id set not null;

create index staff_restaurant_id_idx on staff (restaurant_id);
create index tables_restaurant_id_idx on tables (restaurant_id);
create index obstacles_restaurant_id_idx on obstacles (restaurant_id);
create index reservations_restaurant_id_idx on reservations (restaurant_id);

-- floor_plan was a fixed singleton row (id=1). Becomes one row per
-- restaurant, keyed by restaurant_id instead of a fixed id.
alter table floor_plan add column restaurant_id bigint references restaurants(id) on delete cascade;
update floor_plan set restaurant_id = (select id from restaurants where slug = 'default');
alter table floor_plan alter column restaurant_id set not null;
alter table floor_plan drop constraint floor_plan_singleton;
alter table floor_plan drop constraint floor_plan_pkey;
alter table floor_plan drop column id;
alter table floor_plan add primary key (restaurant_id);

-- Drop the old single-tenant policies; replaced below with restaurant- and
-- role-scoped ones.
drop policy "active staff can write tables" on tables;
drop policy "active staff can write obstacles" on obstacles;
drop policy "active staff can write reservations" on reservations;
drop policy "active staff can write floor_plan" on floor_plan;
drop policy "staff can read own row" on staff;

alter table restaurants enable row level security;
alter table super_admins enable row level security;
alter table staff_invites enable row level security;

create policy "super admins read own row"
  on super_admins for select
  to authenticated
  using (id = (select auth.uid()));

create policy "restaurants select"
  on restaurants for select
  to authenticated
  using (
    exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = restaurants.id and staff.active)
    or exists (select 1 from super_admins where super_admins.id = (select auth.uid()))
  );

create policy "restaurants insert"
  on restaurants for insert
  to authenticated
  with check (exists (select 1 from super_admins where super_admins.id = (select auth.uid())));

create policy "restaurants update"
  on restaurants for update
  to authenticated
  using (exists (select 1 from super_admins where super_admins.id = (select auth.uid())))
  with check (exists (select 1 from super_admins where super_admins.id = (select auth.uid())));

create policy "restaurants delete"
  on restaurants for delete
  to authenticated
  using (exists (select 1 from super_admins where super_admins.id = (select auth.uid())));

-- staff: select self, or any row in a restaurant you own; writes require
-- being an active owner of that row's restaurant.
create policy "staff select"
  on staff for select
  to authenticated
  using (
    id = (select auth.uid())
    or exists (select 1 from staff me where me.id = (select auth.uid()) and me.restaurant_id = staff.restaurant_id and me.role = 'owner' and me.active)
  );

create policy "staff insert"
  on staff for insert
  to authenticated
  with check (exists (select 1 from staff me where me.id = (select auth.uid()) and me.restaurant_id = staff.restaurant_id and me.role = 'owner' and me.active));

create policy "staff update"
  on staff for update
  to authenticated
  using (exists (select 1 from staff me where me.id = (select auth.uid()) and me.restaurant_id = staff.restaurant_id and me.role = 'owner' and me.active))
  with check (exists (select 1 from staff me where me.id = (select auth.uid()) and me.restaurant_id = staff.restaurant_id and me.role = 'owner' and me.active));

create policy "staff delete"
  on staff for delete
  to authenticated
  using (exists (select 1 from staff me where me.id = (select auth.uid()) and me.restaurant_id = staff.restaurant_id and me.role = 'owner' and me.active));

-- staff_invites: managed by restaurant owners, or a super-admin (needed to
-- grant a brand-new restaurant's very first owner, before any staff row
-- for that restaurant exists).
create policy "staff_invites select"
  on staff_invites for select
  to authenticated
  using (
    exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = staff_invites.restaurant_id and staff.role = 'owner' and staff.active)
    or exists (select 1 from super_admins where super_admins.id = (select auth.uid()))
  );

create policy "staff_invites insert"
  on staff_invites for insert
  to authenticated
  with check (
    exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = staff_invites.restaurant_id and staff.role = 'owner' and staff.active)
    or exists (select 1 from super_admins where super_admins.id = (select auth.uid()))
  );

create policy "staff_invites delete"
  on staff_invites for delete
  to authenticated
  using (
    exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = staff_invites.restaurant_id and staff.role = 'owner' and staff.active)
    or exists (select 1 from super_admins where super_admins.id = (select auth.uid()))
  );

-- tables / obstacles / reservations / floor_plan: same restaurant-scoped
-- select for any active staff member; writes additionally require the
-- role not be 'viewer'.
create policy "tables select" on tables for select to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = tables.restaurant_id and staff.active));
create policy "tables insert" on tables for insert to authenticated
  with check (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = tables.restaurant_id and staff.active and staff.role != 'viewer'));
create policy "tables update" on tables for update to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = tables.restaurant_id and staff.active and staff.role != 'viewer'))
  with check (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = tables.restaurant_id and staff.active and staff.role != 'viewer'));
create policy "tables delete" on tables for delete to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = tables.restaurant_id and staff.active and staff.role != 'viewer'));

create policy "obstacles select" on obstacles for select to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = obstacles.restaurant_id and staff.active));
create policy "obstacles insert" on obstacles for insert to authenticated
  with check (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = obstacles.restaurant_id and staff.active and staff.role != 'viewer'));
create policy "obstacles update" on obstacles for update to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = obstacles.restaurant_id and staff.active and staff.role != 'viewer'))
  with check (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = obstacles.restaurant_id and staff.active and staff.role != 'viewer'));
create policy "obstacles delete" on obstacles for delete to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = obstacles.restaurant_id and staff.active and staff.role != 'viewer'));

create policy "reservations select" on reservations for select to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = reservations.restaurant_id and staff.active));
create policy "reservations insert" on reservations for insert to authenticated
  with check (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = reservations.restaurant_id and staff.active and staff.role != 'viewer'));
create policy "reservations update" on reservations for update to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = reservations.restaurant_id and staff.active and staff.role != 'viewer'))
  with check (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = reservations.restaurant_id and staff.active and staff.role != 'viewer'));
create policy "reservations delete" on reservations for delete to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = reservations.restaurant_id and staff.active and staff.role != 'viewer'));

create policy "floor_plan select" on floor_plan for select to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = floor_plan.restaurant_id and staff.active));
create policy "floor_plan insert" on floor_plan for insert to authenticated
  with check (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = floor_plan.restaurant_id and staff.active and staff.role != 'viewer'));
create policy "floor_plan update" on floor_plan for update to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = floor_plan.restaurant_id and staff.active and staff.role != 'viewer'))
  with check (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = floor_plan.restaurant_id and staff.active and staff.role != 'viewer'));
create policy "floor_plan delete" on floor_plan for delete to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.restaurant_id = floor_plan.restaurant_id and staff.active and staff.role != 'viewer'));

-- Redeems a pending invite for the currently authenticated user's email,
-- creating their `staff` row. SECURITY DEFINER is required here: a
-- brand-new invitee isn't yet staff/owner of anything, so the plain "staff
-- insert" policy above would otherwise reject their own self-redemption.
-- Narrowly scoped, auth.uid()-checked, and not callable by anon.
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
    insert into public.staff (id, restaurant_id, email, role, active)
    values (auth.uid(), invite.restaurant_id, my_email, invite.role, true)
    on conflict (id) do nothing;
    delete from public.staff_invites where id = invite.id;
  end if;
end;
$$;

revoke execute on function redeem_staff_invite() from public, anon;
grant execute on function redeem_staff_invite() to authenticated;
