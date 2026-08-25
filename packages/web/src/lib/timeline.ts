import { formatTimeOfDay, parseTimeOfDay, type Reservation } from "@seat-happens/shared";
import * as Duration from "effect/Duration";

export interface TimeSlot {
  time: string; // "HH:MM", one per `stepMinutes`
  isHourMark: boolean; // true on the hour — a hint for header styling/labeling
}

// Column headers for a timeline grid — one slot per `stepMinutes` between
// startTime and endTime (inclusive of startTime, exclusive of endTime).
export function buildTimeSlots(startTime: string, endTime: string, stepMinutes = 15): TimeSlot[] {
  const startMin = Duration.toMinutes(parseTimeOfDay(startTime));
  const endMin = Duration.toMinutes(parseTimeOfDay(endTime));
  const slots: TimeSlot[] = [];
  for (let m = startMin; m < endMin; m += stepMinutes) {
    slots.push({ time: formatTimeOfDay(Duration.minutes(m)), isHourMark: m % 60 === 0 });
  }
  return slots;
}

export interface TimelinePillPlacement {
  reservation: Reservation;
  tableId: number;
  startPercent: number; // 0-100, position within [startTime, endTime)
  widthPercent: number; // 0-100, width within [startTime, endTime)
}

// One placement per (reservation, table) pair — a multi-table reservation
// (tableIds.length > 1) gets one placement per table it occupies, so the
// caller can render it in each of those tables' rows. Reservations that
// fall outside [startTime, endTime) are clamped to the visible window
// rather than dropped; ones entirely outside it are omitted.
export function buildPillPlacements(
  reservations: Reservation[],
  startTime: string,
  endTime: string,
): TimelinePillPlacement[] {
  const startMin = Duration.toMinutes(parseTimeOfDay(startTime));
  const endMin = Duration.toMinutes(parseTimeOfDay(endTime));
  const totalMin = endMin - startMin;
  if (totalMin <= 0) return [];

  const placements: TimelinePillPlacement[] = [];
  for (const reservation of reservations) {
    const resStart = Duration.toMinutes(parseTimeOfDay(reservation.startTime));
    const resEnd = resStart + reservation.durationMin;
    const clampedStart = Math.max(resStart, startMin);
    const clampedEnd = Math.min(resEnd, endMin);
    if (clampedEnd <= clampedStart) continue;

    const startPercent = ((clampedStart - startMin) / totalMin) * 100;
    const widthPercent = ((clampedEnd - clampedStart) / totalMin) * 100;

    for (const tableId of reservation.tableIds) {
      placements.push({ reservation, tableId, startPercent, widthPercent });
    }
  }
  return placements;
}
