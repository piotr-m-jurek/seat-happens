import { useAtomRefresh } from "@effect/atom-react";
import type { Restaurant } from "@seat-happens/shared";
import { useState, type FormEvent } from "react";
import { restaurantAtom } from "../atoms";
import { restaurantsRepo } from "../data/restaurantsRepo";

// Owns RestaurantSettingsPage's field state and save action. Scoped to
// the page's own subtree, so a local hook, not an atom.
export function useRestaurantSettingsForm(restaurant: Restaurant) {
  const [name, setName] = useState(restaurant.name);
  // Postgres `time` comes back "HH:MM:SS" — <input type="time"> wants
  // "HH:MM"; Postgres accepts "HH:MM" back just fine on write.
  const [openTime, setOpenTime] = useState(restaurant.openTime.slice(0, 5));
  const [closeTime, setCloseTime] = useState(restaurant.closeTime.slice(0, 5));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const refreshRestaurant = useAtomRefresh(restaurantAtom(restaurant.slug));

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await restaurantsRepo.update(restaurant.id, { name, openTime, closeTime });
      // restaurantAtom is the one-shot lookup RestaurantRoute (App.tsx)
      // actually resolves through — refresh it so the header/Timeline
      // pick up the change without a manual reload.
      refreshRestaurant();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }

  return {
    name,
    setName,
    openTime,
    setOpenTime,
    closeTime,
    setCloseTime,
    error,
    busy,
    saved,
    save,
  };
}
