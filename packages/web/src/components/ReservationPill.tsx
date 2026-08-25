import { formatTime, type Reservation } from "@sit-happens/shared";

// Position-agnostic on the vertical axis — startPercent/widthPercent
// place it horizontally within whatever "track" container it's rendered
// in (see TimelineGrid); the caller decides top offset/stacking when more
// than one pill lands in the same track.
export function ReservationPill({
  reservation,
  startPercent,
  widthPercent,
  onClick,
}: {
  reservation: Reservation;
  startPercent: number;
  widthPercent: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-1 bottom-1 flex items-center overflow-hidden rounded-md border-2 border-primary bg-primary/10 px-2 text-xs font-medium text-primary"
      style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
      title={`${reservation.guestName} · ${formatTime(reservation.startTime)} · ${reservation.partySize}p`}
    >
      <span className="truncate">{reservation.guestName}</span>
    </button>
  );
}
