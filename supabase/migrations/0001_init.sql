-- staff: who is allowed to log in and use the app.
-- v1 seeds exactly one row manually (see README), but role/active exist
-- from day one so extending to real multi-staff RBAC is a data change,
-- not a schema rewrite.
create table staff (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  role text not null default 'owner' check (role in ('owner', 'staff', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table tables (
  id bigint generated always as identity primary key,
  name text not null,
  seats int not null check (seats > 0),
  x real not null default 0.5,
  y real not null default 0.5
);

create table reservations (
  id bigint generated always as identity primary key,
  table_id bigint not null references tables(id) on delete cascade,
  guest_name text not null,
  party_size int not null check (party_size > 0),
  date date not null,
  start_time time not null,
  duration_min int not null default 90 check (duration_min > 0),
  notes text,
  created_by uuid references staff(id),
  created_at timestamptz not null default now()
);

create index reservations_date_idx on reservations (date);
create index reservations_table_id_idx on reservations (table_id);

alter table staff enable row level security;
alter table tables enable row level security;
alter table reservations enable row level security;

-- staff: a user may only ever see their own row.
create policy "staff can read own row"
  on staff for select
  to authenticated
  using (id = (select auth.uid()));

-- tables / reservations: any active staff member may read and write.
-- Restricting a future 'viewer' role to read-only is a one-line change
-- to the write policies' `using`/`with check` clause below.
create policy "active staff can read tables"
  on tables for select
  to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.active));

create policy "active staff can write tables"
  on tables for all
  to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.active))
  with check (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.active));

create policy "active staff can read reservations"
  on reservations for select
  to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.active));

create policy "active staff can write reservations"
  on reservations for all
  to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.active))
  with check (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.active));

-- enable Realtime change feeds for live sync across devices
alter publication supabase_realtime add table tables;
alter publication supabase_realtime add table reservations;
