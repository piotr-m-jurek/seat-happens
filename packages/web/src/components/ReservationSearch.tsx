import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAtomSet } from "@effect/atom-react";
import { formatTime } from "@seat-happens/shared";
import { selectedDateAtom, tablesAtom } from "../atoms";
import { useCollection } from "../atoms/collection";
import { useReservationSearch } from "../hooks/useReservationSearch";
import { tableNamesLabel } from "../lib/reservations";
import type { ReservationDraft } from "./AppShell";

export function ReservationSearch({
  restaurantId,
  onOpenReservation,
  onClose,
}: {
  restaurantId: number;
  onOpenReservation: (draft: ReservationDraft) => void;
  onClose: () => void;
}) {
  const tables = useCollection(tablesAtom(restaurantId));
  const setSelectedDate = useAtomSet(selectedDateAtom);
  const { query, setQuery, results, loading } = useReservationSearch(restaurantId);

  function openResult(id: number, tableIds: number[], date: string) {
    // Jumps the underlying view to the reservation's own date, then opens
    // it via the same ReservationDraft flow AgendaList/TableDetailPanel
    // already use to open ReservationForm in edit mode.
    setSelectedDate(date);
    onOpenReservation({ id, tableIds });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Find a reservation</DialogTitle>
        </DialogHeader>

        <Input
          autoFocus
          placeholder="Guest name or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Searching…</p>}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-muted-foreground">No reservations found.</p>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => openResult(r.id, r.tableIds, r.date)}
              className="flex w-full flex-col items-start gap-0.5 rounded-lg border-2 p-3 text-left hover:bg-accent"
            >
              <span className="font-medium">
                {r.guestName} · {r.partySize}p
              </span>
              <span className="text-sm text-muted-foreground">
                {r.date} · {formatTime(r.startTime)} · {tableNamesLabel(tables, r.tableIds)}
                {r.phone && ` · ${r.phone}`}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
