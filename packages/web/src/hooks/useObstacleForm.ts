import type { Obstacle } from "@sit-happens/shared";
import { useState, type FormEvent } from "react";
import { obstaclesRepo } from "../data/obstaclesRepo";

// Owns ObstacleEditModal's field state and save/delete-draft handlers —
// see useTableForm for the same shape/rationale.
export function useObstacleForm(
  restaurantId: number,
  value: Obstacle | null,
  onMarkDelete: () => void,
  onUndoDelete: () => void,
  onClose: () => void,
) {
  const [label, setLabel] = useState(value?.label ?? "");
  // Raw text, not a number — see the same note on useTableForm's `seats`.
  const [widthPct, setWidthPct] = useState(String(Math.round((value?.width ?? 0.2) * 100)));
  const [heightPct, setHeightPct] = useState(String(Math.round((value?.height ?? 0.2) * 100)));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const width = Number(widthPct) / 100;
      const height = Number(heightPct) / 100;
      if (value) {
        await obstaclesRepo.update(value.id, { label, width, height });
      } else {
        await obstaclesRepo.create(restaurantId, { label, width, height, x: 0.5, y: 0.5 });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save obstacle.");
      setBusy(false);
    }
  }

  function markDelete() {
    onMarkDelete();
    onClose();
  }

  function undoDelete() {
    onUndoDelete();
    onClose();
  }

  return {
    label,
    setLabel,
    widthPct,
    setWidthPct,
    heightPct,
    setHeightPct,
    error,
    busy,
    save,
    markDelete,
    undoDelete,
  };
}
