import { Button } from "@/components/ui/button";
import { formatTime, useStore } from "../store";
import type { ReservationDraft } from "./AppShell";

export function AgendaList({ onOpenReservation }: { onOpenReservation: (draft: ReservationDraft) => void }) {
  const reservations = useStore((s) => s.reservations);
  const tables = useStore((s) => s.tables);
  const sorted = [...reservations].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const tableName = (id: number) => tables.find((t) => t.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Today's reservations</h2>
        <Button disabled={tables.length === 0} onClick={() => onOpenReservation({ tableId: tables[0].id })}>
          + New reservation
        </Button>
      </div>

      {sorted.length > 0 ? (
        <ul className="space-y-2">
          {sorted.map((r) => (
            <li
              key={r.id}
              className="cursor-pointer rounded-lg border-2 bg-card p-3 hover:bg-accent"
              onClick={() => onOpenReservation({ id: r.id, tableId: r.tableId })}
            >
              <p className="text-base">
                <strong>{formatTime(r.startTime)}</strong> · {tableName(r.tableId)} · {r.guestName} · {r.partySize}p
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
