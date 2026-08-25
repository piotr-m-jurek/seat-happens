import { useAtomValue } from "@effect/atom-react";
import { evaluateBooking, type NewReservation } from "@seat-happens/shared";
import { useMemo, useState, type FormEvent } from "react";
import { reservationsAtom, reservationsKey, selectedDateAtom, tablesAtom } from "../atoms";
import { useCollection } from "../atoms/collection";
import type { ReservationDraft } from "../components/AppShell";
import { reservationsRepo } from "../data/reservationsRepo";
import { defaultReservationTime } from "../lib/reservations";

// Owns every piece of ReservationForm's field state, the derived booking
// evaluation (capacity/conflicts, via the shared use case), and the
// save/remove actions — the component itself is just the <form> markup
// consuming this. Scoped to one component's own subtree (nothing else
// reads reservation-form state — TableDetailPanel/AgendaList only ever
// call onOpenReservation to *open* it), so this is a local hook, not an
// atom.
export function useReservationForm(
  restaurantId: number,
  draft: ReservationDraft,
  onClose: () => void,
) {
  const tables = useCollection(tablesAtom(restaurantId));
  const selectedDate = useAtomValue(selectedDateAtom);
  const reservations = useCollection(reservationsAtom(reservationsKey(restaurantId, selectedDate)));

  const existing = useMemo(
    () => (draft.id ? (reservations.find((r) => r.id === draft.id) ?? null) : null),
    [draft.id, reservations],
  );

  const [tableIds, setTableIds] = useState(existing?.tableIds ?? draft.tableIds);
  const [guestName, setGuestName] = useState(existing?.guestName ?? "");
  // Kept as raw text (not a number) so the field can be cleared while
  // editing instead of snapping to 0 — parsed back to a number on save.
  const [partySize, setPartySize] = useState(String(existing?.partySize ?? 2));
  const [date, setDate] = useState(existing?.date ?? selectedDate);
  const [startTime, setStartTime] = useState(existing?.startTime ?? defaultReservationTime());
  const [durationMin, setDurationMin] = useState(String(existing?.durationMin ?? 90));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { totalSeats, isOverCapacity, conflicts } = evaluateBooking({
    tables,
    existingReservations: reservations,
    tableIds,
    partySize: Number(partySize),
    date,
    startTime,
    durationMin: Number(durationMin),
    excludeReservationId: existing?.id,
  });

  function toggleTable(id: number, checked: boolean) {
    setTableIds((ids) => (checked ? [...ids, id] : ids.filter((i) => i !== id)));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (tableIds.length === 0) {
      setError("Select at least one table.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const payload: NewReservation = {
        tableIds,
        guestName,
        partySize: Number(partySize),
        date,
        startTime,
        durationMin: Number(durationMin),
        notes: notes || null,
      };
      if (existing) {
        await reservationsRepo.update(existing.id, payload);
      } else {
        await reservationsRepo.create(restaurantId, payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save reservation.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing || !confirm("Cancel this reservation?")) return;
    setBusy(true);
    try {
      await reservationsRepo.remove(existing.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel reservation.");
      setBusy(false);
    }
  }

  return {
    tables,
    existing,
    tableIds,
    toggleTable,
    guestName,
    setGuestName,
    partySize,
    setPartySize,
    date,
    setDate,
    startTime,
    setStartTime,
    durationMin,
    setDurationMin,
    notes,
    setNotes,
    error,
    busy,
    totalSeats,
    isOverCapacity,
    conflicts,
    save,
    remove,
  };
}
