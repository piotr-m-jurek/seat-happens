import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAtomValue } from "@effect/atom-react";
import {
  effectiveStatus,
  formatTime,
  reservationsForTable,
  shouldShowByDefault,
  type ReservationStatus,
} from "@seat-happens/shared";
import { reservationsAtom, reservationsKey, selectedDateAtom, tablesAtom } from "../atoms";
import { useCollection } from "../atoms/collection";
import { reservationsRepo } from "../data/reservationsRepo";
import { useNow } from "../hooks/useNow";
import { RESERVATION_STATUS_OPTIONS, tableNamesLabel } from "../lib/reservations";
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
  const bookings = reservationsForTable(reservations, tableId).filter((r) =>
    shouldShowByDefault(r.status),
  );
  const now = useNow();

  if (!table) return null;

  async function changeStatus(id: number, status: ReservationStatus) {
    if (status === "cancelled" && !confirm("Cancel this reservation?")) return;
    await reservationsRepo.update(id, { status });
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
            bookings.map((r) => {
              const likelyNoShow =
                effectiveStatus(r, selectedDate, now.minutes) === "likely_no_show";
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg border-2 p-3"
                >
                  <div
                    className={canWrite ? "flex-1 cursor-pointer" : "flex-1"}
                    onClick={
                      canWrite
                        ? () => onOpenReservation({ id: r.id, tableIds: r.tableIds })
                        : undefined
                    }
                  >
                    <p className="text-base">
                      <strong>{formatTime(r.startTime)}</strong> · {r.guestName} · {r.partySize}p
                      {r.tableIds.length > 1 && ` · ${tableNamesLabel(tables, r.tableIds)}`}
                    </p>
                    {r.notes && <p className="text-sm text-muted-foreground">{r.notes}</p>}
                    {likelyNoShow && <p className="text-sm text-amber-600">Possible no-show</p>}
                  </div>
                  {canWrite && (
                    <Select
                      value={r.status}
                      onValueChange={(v) => changeStatus(r.id, v as ReservationStatus)}
                    >
                      <SelectTrigger className="h-8 w-32" onClick={(e) => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESERVATION_STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })
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
