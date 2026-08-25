import type { Reservation } from "@seat-happens/shared";
import { useEffect, useState } from "react";
import { reservationsRepo } from "../data/reservationsRepo";
import { useDebouncedValue } from "./useDebouncedValue";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

// Owns the search box's state — scoped to the search dialog's own
// subtree, not shared/persisted elsewhere, so a local hook rather than an
// atom (same reasoning as useReservationForm/useTableForm).
export function useReservationSearch(restaurantId: number) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const [results, setResults] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    reservationsRepo
      .search(restaurantId, debouncedQuery)
      .then((found) => {
        if (!cancelled) setResults(found);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    // Ignores a stale response if the query changes again before this
    // one resolves, rather than letting a slow earlier search overwrite
    // a faster later one.
    return () => {
      cancelled = true;
    };
  }, [restaurantId, debouncedQuery]);

  return { query, setQuery, results, loading };
}
