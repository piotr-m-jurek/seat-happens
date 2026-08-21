import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAtomValue } from "@effect/atom-react";
import { addMinutes, evaluateBooking, formatTime, type NewReservation } from "@sit-happens/shared";
import { useMemo, useState, type FormEvent } from "react";
import { reservationsAtom, reservationsKey, selectedDateAtom, tablesAtom } from "../atoms";
import { useCollection } from "../atoms/collection";
import { reservationsRepo } from "../data/reservationsRepo";
import { defaultReservationTime, tableNamesLabel } from "../lib/reservations";
import type { ReservationDraft } from "./AppShell";

export function ReservationForm({
  restaurantId,
  draft,
  onClose,
}: {
  restaurantId: number;
  draft: ReservationDraft;
  onClose: () => void;
}) {
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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={save} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{existing ? "Edit reservation" : "New reservation"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Tables</Label>
            <p className="text-sm text-muted-foreground">
              Select more than one to seat a party across several tables.
            </p>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
              {tables.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 rounded-md p-2 hover:bg-accent"
                >
                  <Checkbox
                    checked={tableIds.includes(t.id)}
                    onCheckedChange={(checked) => toggleTable(t.id, checked === true)}
                  />
                  <span>
                    {t.name} ({t.seats} seats)
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestName">Guest name</Label>
            <Input
              id="guestName"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="partySize">Party size</Label>
            <Input
              id="partySize"
              type="number"
              min="1"
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              required
            />
            {isOverCapacity && (
              <p className="text-sm text-amber-600">
                This party is larger than the selected tables' combined {totalSeats} seats.
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                step="900"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                step="15"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                required
              />
            </div>
          </div>
          {conflicts.length > 0 && (
            <p className="text-sm text-amber-600">
              Already booked:{" "}
              {conflicts
                .map(
                  (c) =>
                    `${tableNamesLabel(tables, c.tableIds)} ${formatTime(c.startTime)}–${formatTime(addMinutes(c.startTime, c.durationMin))} (${c.guestName})`,
                )
                .join(", ")}
              .
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            {existing && (
              <Button type="button" variant="destructive" disabled={busy} onClick={remove}>
                Cancel reservation
              </Button>
            )}
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
