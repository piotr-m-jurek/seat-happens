import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAtomValue } from "@effect/atom-react";
import {
  effectiveStatus,
  reservationsForTable,
  shouldShowByDefault,
  type Table,
} from "@seat-happens/shared";
import { reservationsAtom, reservationsKey, selectedDateAtom } from "../atoms";
import { useCollection } from "../atoms/collection";
import { useNow } from "../hooks/useNow";

export function TableNode({
  restaurantId,
  table,
  onClick,
}: {
  restaurantId: number;
  table: Table;
  onClick: () => void;
}) {
  const selectedDate = useAtomValue(selectedDateAtom);
  const reservations = useCollection(reservationsAtom(reservationsKey(restaurantId, selectedDate)));
  const now = useNow();
  const bookings = reservationsForTable(reservations, table.id).filter((r) =>
    shouldShowByDefault(r.status),
  );
  // Folds in both an explicit "seated" status and the clock-derived
  // "currently within its booked window" — see effectiveStatus — so the
  // floor plan reflects reality without staff having to remember to tap
  // "seated" for every on-time guest.
  const isOccupied = bookings.some(
    (r) => effectiveStatus(r, selectedDate, now.minutes) === "seated",
  );

  return (
    <button
      className={cn(
        "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-xl border-2 shadow-sm transition-colors",
        isOccupied
          ? "border-primary bg-primary text-primary-foreground"
          : bookings.length > 0
            ? "border-primary bg-primary/5"
            : "border-border bg-card",
      )}
      style={{
        left: `${table.x * 100}%`,
        top: `${table.y * 100}%`,
        width: `${table.width * 100}%`,
        height: `${table.height * 100}%`,
      }}
      onClick={onClick}
    >
      <span className="font-semibold">{table.name}</span>
      <span className={cn("text-xs", !isOccupied && "text-muted-foreground")}>
        {table.seats} seats
      </span>
      {bookings.length > 0 && <Badge className="absolute -top-2 -right-2">{bookings.length}</Badge>}
    </button>
  );
}
