# Ideas / backlog

Things deliberately deferred, with the reasoning for later reference —
not a commitment, just a place to keep them from getting lost.

## Automatic no-show detection (real, not just displayed)

Reservation status currently supports "no-show" but it's only ever set
by an explicit staff action. There's also a _derived_ display-only
signal (`effectiveStatus` in `packages/shared/src/domain/reservations.ts`)
that shows a "Possible no-show" hint once a booked reservation is well
past its time window — but that never writes to the database.

A fuller version would have the database itself flip `status` to
`'no_show'` automatically after a grace period, via a real scheduled job
(Postgres `pg_cron`, or a Supabase Edge Function on a timer). Deferred
for now because:

- It's a meaningfully bigger infra lift than a pure client-side derived
  value.
- Auto-writing a no-show risks the system "deciding" a guest didn't show
  before staff has had a chance to seat someone who's just running late
  — the display-only version lets a human always have the last word.

Worth revisiting once there's real demand for the historical/reporting
side of no-show tracking (a report that needs the _actual_ stored status
to be accurate, not just a live hint).
