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
  shouldShowByDefault,
  type ReservationStatus,
} from "@seat-happens/shared";
import { reservationsAtom, reservationsKey, selectedDateAtom, tablesAtom } from "../atoms";
import { useCollection } from "../atoms/collection";
import { reservationsRepo } from "../data/reservationsRepo";
import { useNow } from "../hooks/useNow";
import { RESERVATION_STATUS_OPTIONS, tableNamesLabel } from "../lib/reservations";
import type { ReservationDraft } from "./AppShell";

export function AgendaList({
  restaurantId,
  canWrite,
  onOpenReservation,
}: {
  restaurantId: number;
  canWrite: boolean;
  onOpenReservation: (draft: ReservationDraft) => void;
}) {
  const selectedDate = useAtomValue(selectedDateAtom);
  const reservations = useCollection(reservationsAtom(reservationsKey(restaurantId, selectedDate)));
  const tables = useCollection(tablesAtom(restaurantId));
  const now = useNow();
  const sorted = reservations
    .filter((r) => shouldShowByDefault(r.status))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  async function changeStatus(id: number, status: ReservationStatus) {
    if (status === "cancelled" && !confirm("Cancel this reservation?")) return;
    await reservationsRepo.update(id, { status });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Today's reservations</h2>
        {canWrite && (
          <Button
            disabled={tables.length === 0}
            onClick={() => onOpenReservation({ tableIds: [tables[0].id] })}
          >
            + New reservation
          </Button>
        )}
      </div>

      {sorted.length > 0 ? (
        <ul className="space-y-2">
          {sorted.map((r) => {
            const likelyNoShow = effectiveStatus(r, selectedDate, now.minutes) === "likely_no_show";
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-lg border-2 bg-card p-3">
                <div
                  className={canWrite ? "flex-1 cursor-pointer" : "flex-1"}
                  onClick={
                    canWrite
                      ? () => onOpenReservation({ id: r.id, tableIds: r.tableIds })
                      : undefined
                  }
                >
                  <p className="text-base">
                    <strong>{formatTime(r.startTime)}</strong> ·{" "}
                    {tableNamesLabel(tables, r.tableIds)} · {r.guestName} · {r.partySize}p
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
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No reservations for this date.</p>
      )}
    </div>
  );
}
