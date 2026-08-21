import { Button } from "@/components/ui/button";
import { useAtomValue } from "@effect/atom-react";
import { reservationsAtom, selectedDateAtom, tablesAtom } from "../atoms";
import { useCollection } from "../atoms/collection";
import { formatTime, tableNamesLabel } from "../lib/reservations";
import type { ReservationDraft } from "./AppShell";

export function AgendaList({ onOpenReservation }: { onOpenReservation: (draft: ReservationDraft) => void }) {
  const selectedDate = useAtomValue(selectedDateAtom);
  const reservations = useCollection(reservationsAtom(selectedDate));
  const tables = useCollection(tablesAtom);
  const sorted = [...reservations].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Today's reservations</h2>
        <Button disabled={tables.length === 0} onClick={() => onOpenReservation({ tableIds: [tables[0].id] })}>
          + New reservation
        </Button>
      </div>

      {sorted.length > 0 ? (
        <ul className="space-y-2">
          {sorted.map((r) => (
            <li
              key={r.id}
              className="cursor-pointer rounded-lg border-2 bg-card p-3 hover:bg-accent"
              onClick={() => onOpenReservation({ id: r.id, tableIds: r.tableIds })}
            >
              <p className="text-base">
                <strong>{formatTime(r.startTime)}</strong> · {tableNamesLabel(tables, r.tableIds)} · {r.guestName} ·{" "}
                {r.partySize}p
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
