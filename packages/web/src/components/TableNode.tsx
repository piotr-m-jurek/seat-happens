import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Table } from "@sit-happens/shared";
import { reservationsForTable, useStore } from "../store";

export function TableNode({ table, onClick }: { table: Table; onClick: () => void }) {
  const reservations = useStore((s) => s.reservations);
  const bookings = reservationsForTable(reservations, table.id);

  return (
    <button
      className={cn(
        "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-xl border-2 bg-card shadow-sm transition-colors",
        bookings.length > 0 ? "border-primary bg-primary/5" : "border-border"
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
