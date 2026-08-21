-- A reservation can span multiple tables (a large party gets tables pushed
-- together). Replace the single table_id FK with an array of table ids.
-- Arrays can't carry a real FK, so a trigger on `tables` keeps this in sync
-- on delete: it strips the deleted id from any table_ids array, and removes
-- reservations that end up referencing no tables at all — preserving the
-- "deleting a table removes its reservations" behavior the app already
-- promises in its delete-confirmation dialog.
alter table reservations add column table_ids bigint[] not null default '{}';
update reservations set table_ids = array[table_id] where table_id is not null;
alter table reservations alter column table_ids drop default;
alter table reservations add constraint reservations_table_ids_not_empty check (array_length(table_ids, 1) > 0);
alter table reservations drop column table_id;

create index reservations_table_ids_idx on reservations using gin (table_ids);

create function reservations_cleanup_table_ids() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.reservations
  set table_ids = array_remove(table_ids, old.id)
  where old.id = any(table_ids);
  delete from public.reservations where table_ids = '{}';
  return old;
end;
$$;

create trigger tables_before_delete_cleanup_reservations
  before delete on tables
  for each row execute function reservations_cleanup_table_ids();
