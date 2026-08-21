import * as Duration from "effect/Duration";
import type { Reservation } from "../types";

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
