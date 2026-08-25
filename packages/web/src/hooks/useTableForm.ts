import { nextDuplicateName, type Table } from "@seat-happens/shared";
import { useState, type FormEvent } from "react";
import { tablesAtom } from "../atoms";
import { useCollection } from "../atoms/collection";
import { tablesRepo } from "../data/tablesRepo";

// Owns TableEditModal's field state and save/duplicate/delete-draft
// handlers. Scoped to the modal's own subtree only — nothing else reads
// this state — so a local hook, not an atom.
export function useTableForm(
  restaurantId: number,
  value: Table | null,
  onMarkDelete: () => void,
  onUndoDelete: () => void,
  onClose: () => void,
) {
  const tables = useCollection(tablesAtom(restaurantId));
  const [name, setName] = useState(value?.name ?? "");
  // Raw text, not a number — so the field can be cleared while editing
  // instead of snapping to 0 — parsed back to a number on save.
  const [seats, setSeats] = useState(String(value?.seats ?? 2));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (value) {
        await tablesRepo.update(value.id, { name, seats: Number(seats) });
      } else {
        await tablesRepo.create(restaurantId, {
          name,
          seats: Number(seats),
          x: 0.5,
          y: 0.5,
          width: 0.18,
          height: 0.2,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save table.");
      setBusy(false);
    }
  }

  async function duplicate() {
    if (!value) return;
    setBusy(true);
    setError(null);
    try {
      await tablesRepo.create(restaurantId, {
        name: nextDuplicateName(
          tables.map((t) => t.name),
          value.name,
        ),
        seats: value.seats,
        x: Math.min(0.95, value.x + 0.06),
        y: Math.min(0.95, value.y + 0.06),
        width: value.width,
        height: value.height,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not duplicate table.");
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

  return { name, setName, seats, setSeats, error, busy, save, duplicate, markDelete, undoDelete };
}
