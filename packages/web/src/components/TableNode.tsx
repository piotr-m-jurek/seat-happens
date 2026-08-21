import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAtomValue } from "@effect/atom-react";
import type { Table } from "@sit-happens/shared";
import { reservationsAtom, reservationsKey, selectedDateAtom } from "../atoms";
import { useCollection } from "../atoms/collection";
import { reservationsForTable } from "../lib/reservations";

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
  const bookings = reservationsForTable(reservations, table.id);

  return (
    <button
      className={cn(
        "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-xl border-2 bg-card shadow-sm transition-colors",
        bookings.length > 0 ? "border-primary bg-primary/5" : "border-border",
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
      <span className="text-xs text-muted-foreground">{table.seats} seats</span>
      {bookings.length > 0 && <Badge className="absolute -top-2 -right-2">{bookings.length}</Badge>}
    </button>
  );
}
