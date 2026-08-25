import { useAtomValue } from "@effect/atom-react";
import { effectiveStatus, type Restaurant } from "@seat-happens/shared";
import { reservationsAtom, reservationsKey, selectedDateAtom, tablesAtom } from "@/atoms";
import { useCollection } from "@/atoms/collection";
import { useNow } from "@/hooks/useNow";
import { buildPillPlacements, buildTimeSlots } from "@/lib/timeline";
import { ReservationPill } from "./ReservationPill";
import { TimelineGrid } from "./TimelineGrid";

export function TimelinePage({ restaurant }: { restaurant: Restaurant }) {
  const selectedDate = useAtomValue(selectedDateAtom);
  const reservations = useCollection(
    reservationsAtom(reservationsKey(restaurant.id, selectedDate)),
  );
  const tables = useCollection(tablesAtom(restaurant.id));
  const now = useNow();

  const slots = buildTimeSlots(restaurant.openTime, restaurant.closeTime, 15);
  const placements = buildPillPlacements(reservations, restaurant.openTime, restaurant.closeTime);

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
                status={effectiveStatus(p.reservation, selectedDate, now.minutes)}
                startPercent={p.startPercent}
                widthPercent={p.widthPercent}
              />
            ))
        }
      />
    </div>
  );
}
