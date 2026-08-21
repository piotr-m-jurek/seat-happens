import { Button } from "@/components/ui/button";
import { useAtomValue } from "@effect/atom-react";
import { reservationsAtom, reservationsKey, selectedDateAtom, tablesAtom } from "../atoms";
import { useCollection } from "../atoms/collection";
import { formatTime, tableNamesLabel } from "../lib/reservations";
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
  const sorted = [...reservations].sort((a, b) => a.startTime.localeCompare(b.startTime));

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
          {sorted.map((r) => (
            <li
              key={r.id}
              className={`rounded-lg border-2 bg-card p-3 ${canWrite ? "cursor-pointer hover:bg-accent" : ""}`}
              onClick={
                canWrite ? () => onOpenReservation({ id: r.id, tableIds: r.tableIds }) : undefined
              }
            >
              <p className="text-base">
                <strong>{formatTime(r.startTime)}</strong> · {tableNamesLabel(tables, r.tableIds)} ·{" "}
                {r.guestName} · {r.partySize}p
              </p>
              {r.notes && <p className="text-sm text-muted-foreground">{r.notes}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No reservations for this date.</p>
      )}
    </div>
  );
}
