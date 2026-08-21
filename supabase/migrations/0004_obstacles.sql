-- Non-bookable fixtures (bar, kitchen wall, entrance, ...) placed on the
-- floor plan purely so the layout reads like the real room. Same shape and
-- RLS pattern as `tables`, minus anything reservation-related.
create table obstacles (
  id bigint generated always as identity primary key,
  label text not null,
  x real not null default 0.5,
  y real not null default 0.5,
  width real not null default 0.2 check (width > 0),
  height real not null default 0.2 check (height > 0),
  created_at timestamptz not null default now()
);

alter table obstacles enable row level security;

create policy "active staff can read obstacles"
  on obstacles for select
  to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.active));

create policy "active staff can write obstacles"
  on obstacles for all
  to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.active))
  with check (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.active));

alter publication supabase_realtime add table obstacles;
