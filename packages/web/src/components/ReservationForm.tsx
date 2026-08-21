import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { NewReservation } from "@sit-happens/shared";
import { useMemo, useState, type FormEvent } from "react";
import { reservationsRepo } from "../data/reservationsRepo";
import { addMinutes, formatTime, overlappingReservations, useStore } from "../store";
import type { ReservationDraft } from "./AppShell";

function defaultTime(): string {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  return now.toTimeString().slice(0, 5);
}

export function ReservationForm({ draft, onClose }: { draft: ReservationDraft; onClose: () => void }) {
  const tables = useStore((s) => s.tables);
  const reservations = useStore((s) => s.reservations);
  const selectedDate = useStore((s) => s.selectedDate);

  const existing = useMemo(
    () => (draft.id ? (reservations.find((r) => r.id === draft.id) ?? null) : null),
    [draft.id, reservations]
  );

  const [tableId, setTableId] = useState(existing?.tableId ?? draft.tableId);
  const [guestName, setGuestName] = useState(existing?.guestName ?? "");
  const [partySize, setPartySize] = useState(existing?.partySize ?? 2);
  const [date, setDate] = useState(existing?.date ?? selectedDate);
  const [startTime, setStartTime] = useState(existing?.startTime ?? defaultTime());
  const [durationMin, setDurationMin] = useState(existing?.durationMin ?? 90);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const table = tables.find((t) => t.id === tableId);
  const overCapacity = table ? partySize > table.seats : false;
  const conflicts = overlappingReservations(reservations, tableId, date, startTime, durationMin, existing?.id);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload: NewReservation = {
        tableId,
        guestName,
        partySize,
        date,
        startTime,
        durationMin,
        notes: notes || null,
      };
      if (existing) {
        await reservationsRepo.update(existing.id, payload);
      } else {
        await reservationsRepo.create(payload);
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
            <Label htmlFor="table">Table</Label>
            <Select value={String(tableId)} onValueChange={(v) => setTableId(Number(v))}>
              <SelectTrigger id="table" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tables.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name} ({t.seats} seats)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestName">Guest name</Label>
            <Input id="guestName" value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="partySize">Party size</Label>
            <Input
              id="partySize"
              type="number"
              min="1"
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
              required
            />
            {overCapacity && (
              <p className="text-sm text-amber-600">This party is larger than the table's {table?.seats} seats.</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                step="15"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                required
              />
            </div>
          </div>
          {conflicts.length > 0 && (
            <p className="text-sm text-amber-600">
              {table?.name} is already booked{" "}
              {conflicts
                .map((c) => `${formatTime(c.startTime)}–${formatTime(addMinutes(c.startTime, c.durationMin))} (${c.guestName})`)
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
