alter table reservations
  add column status text not null default 'booked'
    check (status in ('booked', 'seated', 'completed', 'no_show', 'cancelled'));
