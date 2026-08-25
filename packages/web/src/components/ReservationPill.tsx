import { cn } from "@/lib/utils";
import { formatTime, type Reservation, type ReservationStatus } from "@seat-happens/shared";

const STATUS_STYLE: Record<ReservationStatus | "likely_no_show", string> = {
  booked: "border-primary bg-primary/10 text-primary",
  seated: "border-primary bg-primary text-primary-foreground",
  completed: "border-muted-foreground/40 bg-muted text-muted-foreground",
  no_show: "border-dashed border-destructive/50 bg-destructive/10 text-destructive",
  likely_no_show: "border-dashed border-amber-600/50 bg-amber-600/10 text-amber-700",
  // Cancelled reservations are filtered out before placements are built
  // (see buildPillPlacements) — kept here only so the lookup stays total.
  cancelled: "border-muted-foreground/40 bg-muted text-muted-foreground opacity-50",
};

// Position-agnostic on the vertical axis — startPercent/widthPercent
// place it horizontally within whatever "track" container it's rendered
// in (see TimelineGrid); the caller decides top offset/stacking when more
// than one pill lands in the same track. `status` is the caller's
// already-computed *effective* status (see effectiveStatus in the shared
// domain layer), not necessarily the reservation's raw stored status —
// so a still-"booked" reservation currently within its time window can
// be passed in showing as "seated", same as the floor plan.
export function ReservationPill({
  reservation,
  status,
  startPercent,
  widthPercent,
  onClick,
}: {
  reservation: Reservation;
  status: ReservationStatus | "likely_no_show";
  startPercent: number;
  widthPercent: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute top-1 bottom-1 flex items-center overflow-hidden rounded-md border-2 px-2 text-xs font-medium",
        STATUS_STYLE[status],
      )}
      style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
      title={`${reservation.guestName} · ${formatTime(reservation.startTime)} · ${reservation.partySize}p`}
    >
      <span className="truncate">{reservation.guestName}</span>
    </button>
  );
}
