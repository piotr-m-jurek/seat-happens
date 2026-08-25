import { cn } from "@/lib/utils";
import type { Table } from "@sit-happens/shared";
import { Fragment, type ReactNode } from "react";
import type { TimeSlot } from "../lib/timeline";

// Structural chrome only — a header row of time labels and one row per
// table, each with an empty, relatively-positioned "track" for the
// caller to place pills into via renderTrack. Deliberately doesn't know
// about reservations, overlap handling, or how pills stack within a
// track — that's for whoever composes this.
export function TimelineGrid({
  tables,
  slots,
  renderTrack,
}: {
  tables: Table[];
  slots: TimeSlot[];
  renderTrack: (table: Table) => ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <div
        className="grid"
        style={{ gridTemplateColumns: `10rem repeat(${slots.length}, minmax(2rem, 1fr))` }}
      >
        <div className="sticky left-0 z-10 border-b bg-card p-2 text-sm font-medium">Table</div>
        {slots.map((slot) => (
          <div
            key={slot.time}
            className={cn(
              "border-b border-l p-1 text-center text-xs text-muted-foreground",
              slot.isHourMark && "font-medium text-foreground",
            )}
          >
            {slot.isHourMark ? slot.time : ""}
          </div>
        ))}

        {tables.map((table) => (
          <Fragment key={table.id}>
            <div className="sticky left-0 z-10 border-b bg-card p-2 text-sm">{table.name}</div>
            <div className="relative border-b" style={{ gridColumn: `2 / span ${slots.length}` }}>
              {renderTrack(table)}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
