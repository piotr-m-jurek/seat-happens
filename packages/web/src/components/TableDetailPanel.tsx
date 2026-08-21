import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { reservationsRepo } from "../data/reservationsRepo";
import { formatTime, reservationsForTable, useStore } from "../store";
import type { ReservationDraft } from "./AppShell";

export function TableDetailPanel({
  tableId,
  onClose,
  onOpenReservation,
}: {
  tableId: number;
  onClose: () => void;
  onOpenReservation: (draft: ReservationDraft) => void;
}) {
  const tables = useStore((s) => s.tables);
  const reservations = useStore((s) => s.reservations);
  const table = tables.find((t) => t.id === tableId);
  const bookings = reservationsForTable(reservations, tableId);

  if (!table) return null;

  async function cancelReservation(id: number) {
    if (!confirm("Cancel this reservation?")) return;
    await reservationsRepo.remove(id);
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>{table.name}</SheetTitle>
          <SheetDescription>{table.seats} seats</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-2 overflow-auto px-4">
          {bookings.length > 0 ? (
            bookings.map((r) => (
              <div
                key={r.id}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border-2 p-3 hover:bg-accent"
                onClick={() => onOpenReservation({ id: r.id, tableId: r.tableId })}
              >
                <div>
                  <p className="text-base">
                    <strong>{formatTime(r.startTime)}</strong> · {r.guestName} · {r.partySize}p
                  </p>
                  {r.notes && <p className="text-sm text-muted-foreground">{r.notes}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelReservation(r.id);
                  }}
                >
                  Cancel
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No reservations for this date.</p>
          )}
        </div>

        <div className="px-4 pb-4">
          <Button size="lg" className="w-full" onClick={() => onOpenReservation({ tableId })}>
            + New reservation
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
