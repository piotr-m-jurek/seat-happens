import { useAtom } from "@effect/atom-react";
import type { FloorPlanSize } from "@sit-happens/shared";
import { useCallback, useEffect, useState } from "react";
import { floorPlanAtom, layoutDraftAtom, obstaclesAtom, tablesAtom } from "../atoms";
import { useAsyncValue, useCollection } from "../atoms/collection";
import { floorPlanRepo } from "../data/floorPlanRepo";
import { obstaclesRepo } from "../data/obstaclesRepo";
import { tablesRepo } from "../data/tablesRepo";
import type { Rect } from "../lib/geometry";

// x/y/width/height are Postgres `real` (32-bit float) columns, so a value
// written as a 64-bit JS double comes back from the server rounded to
// float4 precision — comparing with === would never match, leaving the
// draft stuck as "unsaved" forever. This tolerance is far looser than
// float4 rounding error (~1e-7 for values in this range) but still far
// tighter than a meaningful drag/resize movement.
const SYNCED_EPSILON = 1e-4;

function closeEnough(a: number, b: number): boolean {
  return Math.abs(a - b) < SYNCED_EPSILON;
}

function sameRect(a: Rect, b: Rect): boolean {
  return (
    closeEnough(a.x, b.x) &&
    closeEnough(a.y, b.y) &&
    closeEnough(a.width, b.width) &&
    closeEnough(a.height, b.height)
  );
}

function sameSize(a: FloorPlanSize, b: FloorPlanSize): boolean {
  return closeEnough(a.width, b.width) && closeEnough(a.height, b.height);
}

type RectMap = Record<number, Rect>;
type DeletedMap = Record<number, true>;

// Drops a draft entry once the server-driven value has caught up to it —
// not on save itself, since the realtime echo of our own write can lag
// behind the write's own response and would otherwise flash the shape
// back to its pre-save position for a moment.
//
// Only calls setDraft when something actually needs to change — unlike
// useState's setter, an atom's setter doesn't skip notifying subscribers
// just because the new value is reference-equal to the old one, so
// calling it unconditionally on every effect run (this one re-runs most
// renders, since toRect is a fresh closure each time) becomes an infinite
// render loop instead of a harmless no-op.
function useDraftSync<T extends { id: number }>(
  items: T[],
  toRect: (item: T) => Rect,
  draft: RectMap,
  setDraft: (updater: (d: RectMap) => RectMap) => void,
) {
  useEffect(() => {
    let next: RectMap | null = null;
    for (const item of items) {
      const pending = draft[item.id];
      if (pending && sameRect(pending, toRect(item))) {
        next ??= { ...draft };
        delete next[item.id];
      }
    }
    if (next) {
      const resolved = next;
      setDraft(() => resolved);
    }
  }, [items, toRect, draft, setDraft]);
}

// Drops a pending-delete id once it's no longer in the server-driven list
// — same reasoning as useDraftSync (both the "don't clear on save" logic
// and the "only call setDraft when something changed" guard).
function useDeleteDraftSync(
  items: { id: number }[],
  deleted: DeletedMap,
  setDeleted: (updater: (d: DeletedMap) => DeletedMap) => void,
) {
  useEffect(() => {
    const currentIds = new Set(items.map((item) => item.id));
    let changed = false;
    const next: DeletedMap = {};
    for (const idStr of Object.keys(deleted)) {
      const id = Number(idStr);
      // Still present server-side: the delete hasn't landed yet, keep it
      // pending. Gone from the list: the delete is confirmed, drop it.
      if (currentIds.has(id)) {
        next[id] = true;
      } else {
        changed = true;
      }
    }
    if (changed) {
      setDeleted(() => next);
    }
  }, [items, deleted, setDeleted]);
}

// Owns everything the Layout tab needs beyond rendering: the server data,
// the local draft overlay (position/size/deletion edits not yet saved,
// atom-backed — see layoutDraftAtom in atoms/index.ts for why), and the
// save action.
export function useLayoutDraft(restaurantId: number) {
  const tables = useCollection(tablesAtom(restaurantId));
  const obstacles = useCollection(obstaclesAtom(restaurantId));
  const floorPlan = useAsyncValue(floorPlanAtom(restaurantId), { width: 4, height: 3 });
  const [draft, setDraft] = useAtom(layoutDraftAtom(restaurantId));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const setDraftTables = useCallback(
    (updater: (d: RectMap) => RectMap) => setDraft((d) => ({ ...d, tables: updater(d.tables) })),
    [setDraft],
  );
  const setDraftObstacles = useCallback(
    (updater: (d: RectMap) => RectMap) =>
      setDraft((d) => ({ ...d, obstacles: updater(d.obstacles) })),
    [setDraft],
  );
  const setDeletedTables = useCallback(
    (updater: (d: DeletedMap) => DeletedMap) =>
      setDraft((d) => ({ ...d, deletedTables: updater(d.deletedTables) })),
    [setDraft],
  );
  const setDeletedObstacles = useCallback(
    (updater: (d: DeletedMap) => DeletedMap) =>
      setDraft((d) => ({ ...d, deletedObstacles: updater(d.deletedObstacles) })),
    [setDraft],
  );

  useDraftSync(
    tables,
    (t) => ({ x: t.x, y: t.y, width: t.width, height: t.height }),
    draft.tables,
    setDraftTables,
  );
  useDraftSync(
    obstacles,
    (o) => ({ x: o.x, y: o.y, width: o.width, height: o.height }),
    draft.obstacles,
    setDraftObstacles,
  );
  useDeleteDraftSync(tables, draft.deletedTables, setDeletedTables);
  useDeleteDraftSync(obstacles, draft.deletedObstacles, setDeletedObstacles);
  useEffect(() => {
    if (draft.roomSize && sameSize(draft.roomSize, floorPlan)) {
      setDraft((d) => ({ ...d, roomSize: null }));
    }
  }, [floorPlan, draft.roomSize, setDraft]);

  const isDirty =
    Object.keys(draft.tables).length > 0 ||
    Object.keys(draft.obstacles).length > 0 ||
    Object.keys(draft.deletedTables).length > 0 ||
    Object.keys(draft.deletedObstacles).length > 0 ||
    draft.roomSize !== null;

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      await Promise.all([
        // Skip position/size updates for anything also marked for deletion
        // — it's about to be removed, moving it first is pointless.
        ...Object.entries(draft.tables)
          .filter(([id]) => !(Number(id) in draft.deletedTables))
          .map(([id, rect]) => tablesRepo.update(Number(id), rect)),
        ...Object.entries(draft.obstacles)
          .filter(([id]) => !(Number(id) in draft.deletedObstacles))
          .map(([id, rect]) => obstaclesRepo.update(Number(id), rect)),
        ...Object.keys(draft.deletedTables).map((id) => tablesRepo.remove(Number(id))),
        ...Object.keys(draft.deletedObstacles).map((id) => obstaclesRepo.remove(Number(id))),
        ...(draft.roomSize ? [floorPlanRepo.update(restaurantId, draft.roomSize)] : []),
      ]);
      // Draft entries are cleared by useDraftSync/useDeleteDraftSync once
      // each one's server value catches up, not here — see the comments
      // above them.
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save layout.");
    } finally {
      setSaving(false);
    }
  }

  return {
    tables,
    obstacles,
    roomSize: draft.roomSize ?? floorPlan,
    isDirty,
    saving,
    saveError,
    save,
    getTableRect: (id: number) => draft.tables[id] ?? null,
    isTablePendingDelete: (id: number) => id in draft.deletedTables,
    setTableDraftRect: (id: number, rect: Rect) => setDraftTables((d) => ({ ...d, [id]: rect })),
    markTableDeleted: (id: number) => setDeletedTables((d) => ({ ...d, [id]: true })),
    undoTableDelete: (id: number) =>
      setDeletedTables((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      }),
    getObstacleRect: (id: number) => draft.obstacles[id] ?? null,
    isObstaclePendingDelete: (id: number) => id in draft.deletedObstacles,
    setObstacleDraftRect: (id: number, rect: Rect) =>
      setDraftObstacles((d) => ({ ...d, [id]: rect })),
    markObstacleDeleted: (id: number) => setDeletedObstacles((d) => ({ ...d, [id]: true })),
    undoObstacleDelete: (id: number) =>
      setDeletedObstacles((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      }),
    setRoomDraftSize: (size: FloorPlanSize) => setDraft((d) => ({ ...d, roomSize: size })),
  };
}
