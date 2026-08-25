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
import { addMinutes, formatTime } from "@seat-happens/shared";
import { useReservationForm } from "../hooks/useReservationForm";
import { tableNamesLabel } from "../lib/reservations";
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
  const {
    tables,
    existing,
    tableIds,
    toggleTable,
    guestName,
    setGuestName,
    phone,
    setPhone,
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
    cancel,
  } = useReservationForm(restaurantId, draft, onClose);

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

          <div className="grid grid-cols-2 gap-3">
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
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
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
              <Button type="button" variant="destructive" disabled={busy} onClick={cancel}>
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
