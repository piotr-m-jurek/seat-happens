import { formatTimeOfDay } from "@seat-happens/shared";
import type { FloorPlanSize, ReservationStatus } from "@seat-happens/shared";
import * as DateTime from "effect/DateTime";
import * as Duration from "effect/Duration";
import type { CSSProperties } from "react";

export function localNow(): DateTime.Zoned {
  return DateTime.setZone(DateTime.nowUnsafe(), DateTime.zoneMakeLocal());
}

export function todayISO(): string {
  // Local date, not UTC — the tablet's clock is the restaurant's actual
  // local time, and a UTC-based date would show the wrong day near midnight.
  return DateTime.formatIsoDate(localNow());
}

// Now, rounded up to the next 15-minute mark — used to default the time
// field when starting a new reservation. formatTimeOfDay (from the shared
// domain layer) handles the wrap past midnight (e.g. 23:50 -> "00:00").
export function defaultReservationTime(): string {
  const parts = DateTime.toParts(localNow());
  const roundedMinute = Math.ceil(parts.minute / 15) * 15;
  return formatTimeOfDay(Duration.sum(Duration.hours(parts.hour), Duration.minutes(roundedMinute)));
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

export function tableNamesLabel(
  tables: { id: number; name: string }[],
  tableIds: number[],
): string {
  return tableIds.map((id) => tables.find((t) => t.id === id)?.name ?? "—").join(" + ");
}

// Shared by AgendaList and TableDetailPanel's status Select, so both
// present the same labels/order.
export const RESERVATION_STATUS_OPTIONS: { value: ReservationStatus; label: string }[] = [
  { value: "booked", label: "Booked" },
  { value: "seated", label: "Seated" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No-show" },
  { value: "cancelled", label: "Cancelled" },
];
