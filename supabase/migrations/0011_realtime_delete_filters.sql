-- Supabase Realtime can only evaluate a `filter` on DELETE/UPDATE events if
-- the table has REPLICA IDENTITY FULL — otherwise the deleted row's old
-- values aren't available to check the filter against, and the event is
-- silently dropped. Our filters are on restaurant_id, not each table's own
-- primary key, so tables/obstacles/reservations all need this; floor_plan
-- doesn't, its primary key already is restaurant_id.
alter table tables replica identity full;
alter table obstacles replica identity full;
alter table reservations replica identity full;
