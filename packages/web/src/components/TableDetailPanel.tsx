import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAtomValue } from "@effect/atom-react";
import { formatTime, reservationsForTable } from "@sit-happens/shared";
import { reservationsAtom, reservationsKey, selectedDateAtom, tablesAtom } from "../atoms";
import { useCollection } from "../atoms/collection";
import { reservationsRepo } from "../data/reservationsRepo";
import { tableNamesLabel } from "../lib/reservations";
import type { ReservationDraft } from "./AppShell";

export function TableDetailPanel({
  restaurantId,
  tableId,
  canWrite,
  onClose,
  onOpenReservation,
}: {
  restaurantId: number;
  tableId: number;
  canWrite: boolean;
  onClose: () => void;
  onOpenReservation: (draft: ReservationDraft) => void;
}) {
  const tables = useCollection(tablesAtom(restaurantId));
  const selectedDate = useAtomValue(selectedDateAtom);
  const reservations = useCollection(reservationsAtom(reservationsKey(restaurantId, selectedDate)));
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
                className={`flex items-center justify-between gap-3 rounded-lg border-2 p-3 ${canWrite ? "cursor-pointer hover:bg-accent" : ""}`}
                onClick={
                  canWrite ? () => onOpenReservation({ id: r.id, tableIds: r.tableIds }) : undefined
                }
              >
                <div>
                  <p className="text-base">
                    <strong>{formatTime(r.startTime)}</strong> · {r.guestName} · {r.partySize}p
                    {r.tableIds.length > 1 && ` · ${tableNamesLabel(tables, r.tableIds)}`}
                  </p>
                  {r.notes && <p className="text-sm text-muted-foreground">{r.notes}</p>}
                </div>
                {canWrite && (
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
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No reservations for this date.</p>
          )}
        </div>

        {canWrite && (
          <div className="px-4 pb-4">
            <Button
              size="lg"
              className="w-full"
              onClick={() => onOpenReservation({ tableIds: [tableId] })}
            >
              + New reservation
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
