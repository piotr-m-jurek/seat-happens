-- Deleting a restaurant with tables and reservations failed: the
-- tables_before_delete_cleanup_reservations trigger (0007) updates
-- reservations.table_ids as each table row cascade-deletes, and that
-- UPDATE re-validates reservations_restaurant_id_fkey immediately. But
-- the restaurants row is already gone by that point (its own delete
-- happens first, before cascading to children), so the immediate check
-- fails even though the reservation row itself is about to be
-- cascade-deleted too. Deferring the check to commit time lets all the
-- cascades finish first, by which point the reservation row no longer
-- exists and there's nothing left to check.
alter table reservations
  alter constraint reservations_restaurant_id_fkey deferrable initially deferred;
