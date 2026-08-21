import type { FloorPlanSize, Reservation } from "@sit-happens/shared";
import * as DateTime from "effect/DateTime";
import * as Duration from "effect/Duration";
import type { CSSProperties } from "react";

function localNow(): DateTime.Zoned {
  return DateTime.setZone(DateTime.nowUnsafe(), DateTime.zoneMakeLocal());
}

export function todayISO(): string {
  // Local date, not UTC — the tablet's clock is the restaurant's actual
  // local time, and a UTC-based date would show the wrong day near midnight.
  return DateTime.formatIsoDate(localNow());
}

// Both FloorPlan and LayoutEditor render the room canvas through this one
// function so a position/size set in one always maps to the same spot in
// the other — the room's stored width/height is a ratio + relative
// magnitude in arbitrary "room units", not real pixels.
const FLOOR_PLAN_SCALE = 144; // px per room-unit
const FLOOR_PLAN_MIN_PX = 240;
const FLOOR_PLAN_MAX_PX = 960;

export function floorPlanCanvasStyle(size: FloorPlanSize): CSSProperties {
  const width = Math.min(
    FLOOR_PLAN_MAX_PX,
    Math.max(FLOOR_PLAN_MIN_PX, size.width * FLOOR_PLAN_SCALE),
  );
  return { width: `${width}px`, aspectRatio: `${size.width} / ${size.height}` };
}

export function reservationsForTable(reservations: Reservation[], tableId: number): Reservation[] {
  return reservations
    .filter((r) => r.tableIds.includes(tableId))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function tableNamesLabel(
  tables: { id: number; name: string }[],
  tableIds: number[],
): string {
  return tableIds.map((id) => tables.find((t) => t.id === id)?.name ?? "—").join(" + ");
}

// A "time of day" (no date, e.g. "09:00" or the "09:00:00" Postgres sends
// over the wire) modeled as elapsed time since midnight — Duration is the
// natural fit since these values have no date component for DateTime to
// anchor to. Every function below funnels through this one parse/format
// pair instead of hand-rolling its own H:M string math.
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

// Now, rounded up to the next 15-minute mark — used to default the time
// field when starting a new reservation.
export function defaultReservationTime(): string {
  const parts = DateTime.toParts(localNow());
  const roundedMinute = Math.ceil(parts.minute / 15) * 15;
  return formatTimeOfDay(Duration.sum(Duration.hours(parts.hour), Duration.minutes(roundedMinute)));
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
