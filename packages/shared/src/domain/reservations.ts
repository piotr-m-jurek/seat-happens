import * as Duration from "effect/Duration";
import type { Reservation, ReservationStatus } from "../types";

// A "time of day" (no date, e.g. "09:00" or the "09:00:00" Postgres sends
// over the wire) modeled as elapsed time since midnight — Duration is the
// natural fit since these values have no date component to anchor to.
// Every function below funnels through this one parse/format pair instead
// of hand-rolling its own H:M string math.
export function parseTimeOfDay(time: string): Duration.Duration {
  const [h, m] = time.split(":").map(Number);
  return Duration.sum(Duration.hours(h), Duration.minutes(m));
}

export function formatTimeOfDay(duration: Duration.Duration): string {
  const wrapped = ((Math.round(Duration.toMinutes(duration)) % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Postgres `time` columns come back over the wire as "HH:MM:SS" — this is
// the one place that gets trimmed to "HH:MM" for display.
export function formatTime(time: string): string {
  return formatTimeOfDay(parseTimeOfDay(time));
}

export function addMinutes(time: string, minutes: number): string {
  return formatTimeOfDay(Duration.sum(parseTimeOfDay(time), Duration.minutes(minutes)));
}

function timeRangesOverlap(
  aStart: string,
  aDurationMin: number,
  bStart: string,
  bDurationMin: number,
): boolean {
  const aFrom = Duration.toMinutes(parseTimeOfDay(aStart));
  const aTo = aFrom + aDurationMin;
  const bFrom = Duration.toMinutes(parseTimeOfDay(bStart));
  const bTo = bFrom + bDurationMin;
  return aFrom < bTo && bFrom < aTo;
}

// Other reservations sharing any of the given tables on the same date whose
// time range overlaps the given one — used to warn about (not block)
// double-booking a table.
export function overlappingReservations(
  reservations: Reservation[],
  tableIds: number[],
  date: string,
  startTime: string,
  durationMin: number,
  excludeId?: number,
): Reservation[] {
  return reservations.filter(
    (r) =>
      r.id !== excludeId &&
      r.date === date &&
      r.tableIds.some((id) => tableIds.includes(id)) &&
      timeRangesOverlap(r.startTime, r.durationMin, startTime, durationMin),
  );
}

export function reservationsForTable(reservations: Reservation[], tableId: number): Reservation[] {
  return reservations
    .filter((r) => r.tableIds.includes(tableId))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function isCancelled(status: ReservationStatus): boolean {
  return status === "cancelled";
}

// Cancelled reservations are hidden from the day-to-day views (Agenda,
// table detail, Timeline) — everything else (including completed/no-show)
// stays visible for today's full picture.
export function shouldShowByDefault(status: ReservationStatus): boolean {
  return !isCancelled(status);
}

const DEFAULT_NO_SHOW_GRACE_MINUTES = 20;

// A clock-derived *display* value — never written back to the database.
// An explicit staff-set status (anything but "booked") always wins. A
// still-"booked" reservation for today reads as "seated" while the
// current time falls within its booked window (so the floor plan shows
// it occupied without staff having to remember to tap "seated" for an
// on-time guest), and as "likely_no_show" once well past the end of that
// window with no staff action — a soft prompt, not a real status.
export function effectiveStatus(
  reservation: Pick<Reservation, "status" | "date" | "startTime" | "durationMin">,
  today: string,
  nowMinutes: number,
  graceMinutes = DEFAULT_NO_SHOW_GRACE_MINUTES,
): ReservationStatus | "likely_no_show" {
  if (reservation.status !== "booked" || reservation.date !== today) {
    return reservation.status;
  }
  const startMinutes = Duration.toMinutes(parseTimeOfDay(reservation.startTime));
  const endMinutes = startMinutes + reservation.durationMin;
  if (nowMinutes < startMinutes) return "booked";
  if (nowMinutes <= endMinutes) return "seated";
  if (nowMinutes > endMinutes + graceMinutes) return "likely_no_show";
  return "booked";
}
