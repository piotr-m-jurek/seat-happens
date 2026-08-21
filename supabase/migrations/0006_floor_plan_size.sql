-- Singleton row holding the floor plan canvas's own shape (in arbitrary
-- "room units" — only the width:height ratio and relative magnitude matter,
-- both tabs render it via the same shared sizing helper in store.ts so a
-- table/obstacle position always maps to the same spot on both).
create table floor_plan (
  id bigint primary key default 1,
  width real not null default 4 check (width > 0),
  height real not null default 3 check (height > 0),
  constraint floor_plan_singleton check (id = 1)
);

insert into floor_plan (id, width, height) values (1, 4, 3);

alter table floor_plan enable row level security;

create policy "active staff can read floor_plan"
  on floor_plan for select
  to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.active));

create policy "active staff can write floor_plan"
  on floor_plan for all
  to authenticated
  using (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.active))
  with check (exists (select 1 from staff where staff.id = (select auth.uid()) and staff.active));

alter publication supabase_realtime add table floor_plan;
