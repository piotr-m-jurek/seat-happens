alter table restaurants
  add column open_time time not null default '09:00',
  add column close_time time not null default '23:00';

-- Lets an owner update their own restaurant (previously super-admin
-- only) — private.is_restaurant_owner already exists (migration 0010)
-- for exactly this check. RLS is row-level, not column-level, so this
-- technically also allows an owner to change their own slug even though
-- the owner-facing UI won't expose that field (see the plan's scope
-- note) — slug edits stay on the super-admin-only admin page.
drop policy "restaurants update" on restaurants;
create policy "restaurants update"
  on restaurants for update
  to authenticated
  using (
    private.is_restaurant_owner(restaurants.id)
    or exists (select 1 from super_admins where super_admins.id = (select auth.uid()))
  )
  with check (
    private.is_restaurant_owner(restaurants.id)
    or exists (select 1 from super_admins where super_admins.id = (select auth.uid()))
  );
