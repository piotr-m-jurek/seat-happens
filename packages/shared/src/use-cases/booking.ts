import { totalSeats } from "../domain/tables";
import { overlappingReservations } from "../domain/reservations";
import type { Reservation, Table } from "../types";

export interface BookingEvaluation {
  totalSeats: number;
  isOverCapacity: boolean;
  conflicts: Reservation[];
}

// Composes Table[] + Reservation[] into one booking-validity result —
// capacity and conflicts are checked together since both come from the
// same "which tables, which time" input a reservation form collects.
export function evaluateBooking(input: {
  tables: Table[];
  existingReservations: Reservation[];
  tableIds: number[];
  partySize: number;
  date: string;
  startTime: string;
  durationMin: number;
  excludeReservationId?: number | undefined;
}): BookingEvaluation {
  const selectedTables = input.tables.filter((t) => input.tableIds.includes(t.id));
  const total = totalSeats(selectedTables);
  return {
    totalSeats: total,
    isOverCapacity: selectedTables.length > 0 && input.partySize > total,
    conflicts: overlappingReservations(
      input.existingReservations,
      input.tableIds,
      input.date,
      input.startTime,
      input.durationMin,
      input.excludeReservationId,
    ),
  };
}
