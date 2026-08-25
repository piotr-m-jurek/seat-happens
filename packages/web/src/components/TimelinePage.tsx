import { useAtomValue } from "@effect/atom-react";
import { reservationsAtom, reservationsKey, selectedDateAtom, tablesAtom } from "@/atoms";
import { useCollection } from "@/atoms/collection";
import { buildPillPlacements, buildTimeSlots } from "@/lib/timeline";
import { ReservationPill } from "./ReservationPill";
import { TimelineGrid } from "./TimelineGrid";

// TODO: fixed business hours for now — revisit once there's a real
// per-restaurant hours setting (or derive from the day's reservations).
const START_TIME = "09:00";
const END_TIME = "23:00";

export function TimelinePage({ restaurantId }: { restaurantId: number }) {
  const selectedDate = useAtomValue(selectedDateAtom);
  const reservations = useCollection(reservationsAtom(reservationsKey(restaurantId, selectedDate)));
  const tables = useCollection(tablesAtom(restaurantId));

  const slots = buildTimeSlots(START_TIME, END_TIME, 15);
  const placements = buildPillPlacements(reservations, START_TIME, END_TIME);

  return (
    <div>
      <TimelineGrid
        tables={tables}
        slots={slots}
        renderTrack={(table) =>
          placements
            .filter((p) => p.tableId === table.id)
            .map((p) => (
              <ReservationPill
                key={`${p.reservation.id}-${p.tableId}`}
                reservation={p.reservation}
                startPercent={p.startPercent}
                widthPercent={p.widthPercent}
              />
            ))
        }
      />
    </div>
  );
}
