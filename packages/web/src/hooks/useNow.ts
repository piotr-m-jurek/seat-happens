import * as DateTime from "effect/DateTime";
import { useEffect, useState } from "react";
import { localNow } from "../lib/reservations";

function snapshot(): { date: string; minutes: number } {
  const now = localNow();
  const parts = DateTime.toParts(now);
  return { date: DateTime.formatIsoDate(now), minutes: parts.hour * 60 + parts.minute };
}

// Re-renders consumers on a fixed tick so clock-derived values (see
// effectiveStatus in the shared domain layer) stay fresh as time passes
// without anything else changing.
export function useNow(intervalMs = 60_000): { date: string; minutes: number } {
  const [now, setNow] = useState(snapshot);

  useEffect(() => {
    const id = setInterval(() => setNow(snapshot()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
