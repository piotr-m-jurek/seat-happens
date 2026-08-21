import type { FloorPlanSize, Reservation } from "@sit-happens/shared";
import type { CSSProperties } from "react";

export function todayISO(): string {
  // Local date, not UTC — the tablet's clock is the restaurant's actual
  // local time, and toISOString() would show the wrong day near midnight.
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Both FloorPlan and LayoutEditor render the room canvas through this one
// function so a position/size set in one always maps to the same spot in
// the other — the room's stored width/height is a ratio + relative
// magnitude in arbitrary "room units", not real pixels.
const FLOOR_PLAN_SCALE = 144; // px per room-unit
const FLOOR_PLAN_MIN_PX = 240;
const FLOOR_PLAN_MAX_PX = 960;

export function floorPlanCanvasStyle(size: FloorPlanSize): CSSProperties {
  const width = Math.min(FLOOR_PLAN_MAX_PX, Math.max(FLOOR_PLAN_MIN_PX, size.width * FLOOR_PLAN_SCALE));
  return { width: `${width}px`, aspectRatio: `${size.width} / ${size.height}` };
}

export function reservationsForTable(reservations: Reservation[], tableId: number): Reservation[] {
  return reservations
    .filter((r) => r.tableIds.includes(tableId))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function tableNamesLabel(tables: { id: number; name: string }[], tableIds: number[]): string {
  return tableIds
    .map((id) => tables.find((t) => t.id === id)?.name ?? "—")
    .join(" + ");
}

// Postgres `time` columns come back over the wire as "HH:MM:SS" — this is
// the one place that gets trimmed to "HH:MM" for display.
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function addMinutes(time: string, minutes: number): string {
  const total = (toMinutes(time) + minutes + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeRangesOverlap(aStart: string, aDuration: number, bStart: string, bDuration: number): boolean {
  const aFrom = toMinutes(aStart);
  const bFrom = toMinutes(bStart);
  return aFrom < bFrom + bDuration && bFrom < aFrom + aDuration;
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
  excludeId?: number
): Reservation[] {
  return reservations.filter(
    (r) =>
      r.id !== excludeId &&
      r.date === date &&
      r.tableIds.some((id) => tableIds.includes(id)) &&
      timeRangesOverlap(r.startTime, r.durationMin, startTime, durationMin)
  );
}
