import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FloorPlanSize, Obstacle, Table } from "@sit-happens/shared";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { floorPlanAtom, obstaclesAtom, tablesAtom } from "../atoms";
import { useAsyncValue, useCollection } from "../atoms/collection";
import { floorPlanRepo } from "../data/floorPlanRepo";
import { obstaclesRepo } from "../data/obstaclesRepo";
import { tablesRepo } from "../data/tablesRepo";
import { floorPlanCanvasStyle } from "../lib/reservations";

const DRAG_THRESHOLD_PX = 6;
const MIN_NODE_SIZE = 0.08;

type Rect = { x: number; y: number; width: number; height: number };

// Shared by tables and obstacles: drag the whole shape to reposition, or
// drag its corner handle to resize (top-left corner stays anchored).
function useDragAndResize(
  rectNow: Rect,
  canvasRef: RefObject<HTMLDivElement | null>,
  onDragEnd: (rect: Rect) => void,
  onResizeEnd: (rect: Rect) => void,
  onClick: () => void,
) {
  const [rect, setRect] = useState(rectNow);
  const dragging = useRef(false);
  const resizing = useRef(false);
  const moved = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const startRect = useRef(rectNow);

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    moved.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    startRect.current = rectNow;
    setRect(rectNow);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (
      !moved.current &&
      Math.abs(e.clientX - start.current.x) < DRAG_THRESHOLD_PX &&
      Math.abs(e.clientY - start.current.y) < DRAG_THRESHOLD_PX
    ) {
      return;
    }
    moved.current = true;
    const box = canvas.getBoundingClientRect();
    // x/y are the shape's center, so keep its edges — not just its
    // center — inside the room.
    const halfWidth = rectNow.width / 2;
    const halfHeight = rectNow.height / 2;
    const x = Math.min(1 - halfWidth, Math.max(halfWidth, (e.clientX - box.left) / box.width));
    const y = Math.min(1 - halfHeight, Math.max(halfHeight, (e.clientY - box.top) / box.height));
    setRect((r) => ({ ...r, x, y }));
  }

  async function onPointerUp() {
    dragging.current = false;
    if (moved.current) {
      onDragEnd(rect);
    } else {
      onClick();
    }
  }

  function onResizePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizing.current = true;
    start.current = { x: e.clientX, y: e.clientY };
    startRect.current = rectNow;
    setRect(rectNow);
  }

  function onResizePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!resizing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const box = canvas.getBoundingClientRect();
    const dx = (e.clientX - start.current.x) / box.width;
    const dy = (e.clientY - start.current.y) / box.height;
    // Keep the top-left corner anchored; only the dragged (bottom-right)
    // corner moves — so cap width/height there so it can't push past the
    // room's right/bottom edge.
    const leftAnchor = startRect.current.x - startRect.current.width / 2;
    const topAnchor = startRect.current.y - startRect.current.height / 2;
    const width = Math.min(1 - leftAnchor, Math.max(MIN_NODE_SIZE, startRect.current.width + dx));
    const height = Math.min(1 - topAnchor, Math.max(MIN_NODE_SIZE, startRect.current.height + dy));
    const x = leftAnchor + width / 2;
    const y = topAnchor + height / 2;
    setRect({ x, y, width, height });
  }

  async function onResizePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (!resizing.current) return;
    resizing.current = false;
    onResizeEnd(rect);
  }

  return {
    rect,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp,
  };
}

function ResizeHandle({
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className="absolute -right-1 -bottom-1 h-4 w-4 touch-none cursor-nwse-resize rounded-full border-2 border-background bg-primary"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
}

function LayoutTableNode({
  table,
  draftRect,
  isPendingDelete,
  canvasRef,
  onEdit,
  onChangeDraft,
}: {
  table: Table;
  draftRect: Rect | null;
  isPendingDelete: boolean;
  canvasRef: RefObject<HTMLDivElement | null>;
  onEdit: () => void;
  onChangeDraft: (rect: Rect) => void;
}) {
  const tableRect: Rect = draftRect ?? {
    x: table.x,
    y: table.y,
    width: table.width,
    height: table.height,
  };
  // Called unconditionally regardless of isPendingDelete (rules of hooks —
  // it can flip between renders for the same node) but its drag/resize
  // handlers are simply left unwired below while pending deletion.
  const {
    rect,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp,
  } = useDragAndResize(tableRect, canvasRef, onChangeDraft, onChangeDraft, onEdit);
  const displayRect = isPendingDelete ? tableRect : rect;

  return (
    <button
      className={cn(
        "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 touch-none flex-col items-center justify-center gap-0.5 rounded-xl border-2 shadow-sm",
        isPendingDelete
          ? "border-destructive bg-destructive/10 opacity-50"
          : "cursor-grab border-border bg-card",
      )}
      style={{
        left: `${displayRect.x * 100}%`,
        top: `${displayRect.y * 100}%`,
        width: `${displayRect.width * 100}%`,
        height: `${displayRect.height * 100}%`,
      }}
      onPointerDown={isPendingDelete ? undefined : onPointerDown}
      onPointerMove={isPendingDelete ? undefined : onPointerMove}
      onPointerUp={isPendingDelete ? onEdit : onPointerUp}
    >
      <span className="font-semibold">{table.name}</span>
      <span className="text-xs text-muted-foreground">{table.seats} seats</span>
      {!isPendingDelete && (
        <ResizeHandle
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
        />
      )}
    </button>
  );
}

function LayoutObstacleNode({
  obstacle,
  draftRect,
  isPendingDelete,
  canvasRef,
  onEdit,
  onChangeDraft,
}: {
  obstacle: Obstacle;
  draftRect: Rect | null;
  isPendingDelete: boolean;
  canvasRef: RefObject<HTMLDivElement | null>;
  onEdit: () => void;
  onChangeDraft: (rect: Rect) => void;
}) {
  const obstacleRect: Rect = draftRect ?? {
    x: obstacle.x,
    y: obstacle.y,
    width: obstacle.width,
    height: obstacle.height,
  };
  const {
    rect,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp,
  } = useDragAndResize(obstacleRect, canvasRef, onChangeDraft, onChangeDraft, onEdit);
  const displayRect = isPendingDelete ? obstacleRect : rect;

  return (
    <button
      className={cn(
        "absolute flex -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-md border-2 border-dashed text-sm",
        isPendingDelete
          ? "border-destructive bg-destructive/10 text-destructive opacity-50"
          : "cursor-grab border-muted-foreground/40 bg-muted/60 text-muted-foreground",
      )}
      style={{
        left: `${displayRect.x * 100}%`,
        top: `${displayRect.y * 100}%`,
        width: `${displayRect.width * 100}%`,
        height: `${displayRect.height * 100}%`,
      }}
      onPointerDown={isPendingDelete ? undefined : onPointerDown}
      onPointerMove={isPendingDelete ? undefined : onPointerMove}
      onPointerUp={isPendingDelete ? onEdit : onPointerUp}
    >
      {obstacle.label}
      {!isPendingDelete && (
        <ResizeHandle
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
        />
      )}
    </button>
  );
}

type Editing =
  | { kind: "table"; value: Table | null }
  | { kind: "obstacle"; value: Obstacle | null }
  | null;

const MIN_ROOM_UNITS = 1.5;

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

// Drops a draft entry once the server-driven value has caught up to it —
// not on save itself, since the realtime echo of our own write can lag
// behind the write's own response and would otherwise flash the shape
// back to its pre-save position for a moment.
function useDraftSync<T extends { id: number }>(
  items: T[],
  toRect: (item: T) => Rect,
  setDraft: (updater: (d: Record<number, Rect>) => Record<number, Rect>) => void,
) {
  useEffect(() => {
    setDraft((draft) => {
      let next: Record<number, Rect> | null = null;
      for (const item of items) {
        const pending = draft[item.id];
        if (pending && sameRect(pending, toRect(item))) {
          next ??= { ...draft };
          delete next[item.id];
        }
      }
      return next ?? draft;
    });
  }, [items, toRect, setDraft]);
}

// Drops a pending-delete id once it's no longer in the server-driven list
// — same reasoning as useDraftSync: don't clear it right on save, since
// the realtime echo of our own delete can lag behind the delete's own
// response and would otherwise flash the shape back for a moment.
function useDeleteDraftSync(
  items: { id: number }[],
  setDeleted: (updater: (d: Record<number, true>) => Record<number, true>) => void,
) {
  useEffect(() => {
    setDeleted((deleted) => {
      const currentIds = new Set(items.map((item) => item.id));
      let changed = false;
      const next: Record<number, true> = {};
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
      return changed ? next : deleted;
    });
  }, [items, setDeleted]);
}

export function LayoutEditor({ restaurantId }: { restaurantId: number }) {
  const tables = useCollection(tablesAtom(restaurantId));
  const obstacles = useCollection(obstaclesAtom(restaurantId));
  const floorPlan = useAsyncValue(floorPlanAtom(restaurantId), { width: 4, height: 3 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<Editing>(null);

  // Dragging/resizing only ever touches this local draft — nothing is
  // persisted until "Save layout" is clicked. Otherwise every gesture hits
  // the DB immediately, and the realtime echo of our own write can arrive
  // out of order with a stale in-flight refetch, visibly snapping the
  // shape back before jumping to its real position.
  const [draftTables, setDraftTables] = useState<Record<number, Rect>>({});
  const [draftObstacles, setDraftObstacles] = useState<Record<number, Rect>>({});
  const [draftRoomSize, setDraftRoomSize] = useState<FloorPlanSize | null>(null);
  // Deletion is a draft too — marking a table/obstacle for deletion only
  // flags it here; the actual remove() call happens in saveLayout().
  const [draftDeletedTables, setDraftDeletedTables] = useState<Record<number, true>>({});
  const [draftDeletedObstacles, setDraftDeletedObstacles] = useState<Record<number, true>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isDirty =
    Object.keys(draftTables).length > 0 ||
    Object.keys(draftObstacles).length > 0 ||
    Object.keys(draftDeletedTables).length > 0 ||
    Object.keys(draftDeletedObstacles).length > 0 ||
    draftRoomSize !== null;

  useDraftSync(
    tables,
    (t) => ({ x: t.x, y: t.y, width: t.width, height: t.height }),
    setDraftTables,
  );
  useDraftSync(
    obstacles,
    (o) => ({ x: o.x, y: o.y, width: o.width, height: o.height }),
    setDraftObstacles,
  );
  useDeleteDraftSync(tables, setDraftDeletedTables);
  useDeleteDraftSync(obstacles, setDraftDeletedObstacles);
  useEffect(() => {
    setDraftRoomSize((size) => (size && sameSize(size, floorPlan) ? null : size));
  }, [floorPlan]);

  const [liveSize, setLiveSize] = useState(floorPlan);
  const resizingRoom = useRef(false);
  const roomStart = useRef({ x: 0, y: 0 });
  const roomStartSize = useRef(floorPlan);
  const pxPerUnit = useRef({ x: 1, y: 1 });
  const roomSize = draftRoomSize ?? floorPlan;
  const displaySize = resizingRoom.current ? liveSize : roomSize;

  function onRoomResizePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const box = canvas.getBoundingClientRect();
    resizingRoom.current = true;
    roomStart.current = { x: e.clientX, y: e.clientY };
    roomStartSize.current = roomSize;
    pxPerUnit.current = { x: box.width / roomSize.width, y: box.height / roomSize.height };
    setLiveSize(roomSize);
  }

  function onRoomResizePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!resizingRoom.current) return;
    const dx = e.clientX - roomStart.current.x;
    const dy = e.clientY - roomStart.current.y;
    const width = Math.max(MIN_ROOM_UNITS, roomStartSize.current.width + dx / pxPerUnit.current.x);
    const height = Math.max(
      MIN_ROOM_UNITS,
      roomStartSize.current.height + dy / pxPerUnit.current.y,
    );
    setLiveSize({ width, height });
  }

  function onRoomResizePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (!resizingRoom.current) return;
    resizingRoom.current = false;
    setDraftRoomSize(liveSize);
  }

  async function saveLayout() {
    setSaving(true);
    setSaveError(null);
    try {
      await Promise.all([
        // Skip position/size updates for anything also marked for deletion
        // — it's about to be removed, moving it first is pointless.
        ...Object.entries(draftTables)
          .filter(([id]) => !(Number(id) in draftDeletedTables))
          .map(([id, rect]) => tablesRepo.update(Number(id), rect)),
        ...Object.entries(draftObstacles)
          .filter(([id]) => !(Number(id) in draftDeletedObstacles))
          .map(([id, rect]) => obstaclesRepo.update(Number(id), rect)),
        ...Object.keys(draftDeletedTables).map((id) => tablesRepo.remove(Number(id))),
        ...Object.keys(draftDeletedObstacles).map((id) => obstaclesRepo.remove(Number(id))),
        ...(draftRoomSize ? [floorPlanRepo.update(restaurantId, draftRoomSize)] : []),
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Floor layout</h2>
        <div className="flex items-center gap-3">
          {saveError && <span className="text-sm text-destructive">{saveError}</span>}
          {saving ? (
            <span className="text-sm text-muted-foreground">Saving…</span>
          ) : (
            isDirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>
          )}
          {isDirty && (
            <Button onClick={saveLayout} disabled={saving}>
              {saving ? "Saving…" : "Save layout"}
            </Button>
          )}
          <Button variant="outline" onClick={() => setEditing({ kind: "obstacle", value: null })}>
            + Add obstacle
          </Button>
          <Button onClick={() => setEditing({ kind: "table", value: null })}>+ Add table</Button>
        </div>
      </div>

      <div
        ref={canvasRef}
        className="relative mx-auto rounded-xl border bg-card"
        style={floorPlanCanvasStyle(displaySize)}
      >
        {obstacles.map((obstacle) => (
          <LayoutObstacleNode
            key={obstacle.id}
            obstacle={obstacle}
            draftRect={draftObstacles[obstacle.id] ?? null}
            isPendingDelete={obstacle.id in draftDeletedObstacles}
            canvasRef={canvasRef}
            onEdit={() => setEditing({ kind: "obstacle", value: obstacle })}
            onChangeDraft={(rect) => setDraftObstacles((d) => ({ ...d, [obstacle.id]: rect }))}
          />
        ))}
        {tables.map((table) => (
          <LayoutTableNode
            key={table.id}
            table={table}
            draftRect={draftTables[table.id] ?? null}
            isPendingDelete={table.id in draftDeletedTables}
            canvasRef={canvasRef}
            onEdit={() => setEditing({ kind: "table", value: table })}
            onChangeDraft={(rect) => setDraftTables((d) => ({ ...d, [table.id]: rect }))}
          />
        ))}
        <div
          className="absolute -right-2 -bottom-2 z-20 h-5 w-5 touch-none cursor-nwse-resize rounded-full border-2 border-background bg-foreground"
          onPointerDown={onRoomResizePointerDown}
          onPointerMove={onRoomResizePointerMove}
          onPointerUp={onRoomResizePointerUp}
        />
      </div>

      {editing?.kind === "table" && (
        <TableEditModal
          restaurantId={restaurantId}
          value={editing.value}
          isPendingDelete={editing.value !== null && editing.value.id in draftDeletedTables}
          onMarkDelete={() => {
            if (!editing.value) return;
            const id = editing.value.id;
            setDraftDeletedTables((d) => ({ ...d, [id]: true }));
          }}
          onUndoDelete={() => {
            if (!editing.value) return;
            const id = editing.value.id;
            setDraftDeletedTables((d) => {
              const next = { ...d };
              delete next[id];
              return next;
            });
          }}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === "obstacle" && (
        <ObstacleEditModal
          restaurantId={restaurantId}
          value={editing.value}
          isPendingDelete={editing.value !== null && editing.value.id in draftDeletedObstacles}
          onMarkDelete={() => {
            if (!editing.value) return;
            const id = editing.value.id;
            setDraftDeletedObstacles((d) => ({ ...d, [id]: true }));
          }}
          onUndoDelete={() => {
            if (!editing.value) return;
            const id = editing.value.id;
            setDraftDeletedObstacles((d) => {
              const next = { ...d };
              delete next[id];
              return next;
            });
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// "T1" -> "T1 copy" -> "T1 copy 2" -> "T1 copy 3" ..., counting existing
// copies (of either the original or another copy) to pick the next number.
function nextDuplicateName(existingNames: string[], sourceName: string): string {
  const base = sourceName.replace(/ copy(?: \d+)?$/, "");
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const copyPattern = new RegExp(`^${escaped} copy(?: \\d+)?$`);
  const count = existingNames.filter((n) => copyPattern.test(n)).length;
  return count === 0 ? `${base} copy` : `${base} copy ${count + 1}`;
}

function TableEditModal({
  restaurantId,
  value,
  isPendingDelete,
  onMarkDelete,
  onUndoDelete,
  onClose,
}: {
  restaurantId: number;
  value: Table | null;
  isPendingDelete: boolean;
  onMarkDelete: () => void;
  onUndoDelete: () => void;
  onClose: () => void;
}) {
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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {isPendingDelete && value ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>{value.name} will be deleted</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This table — and its reservations — will be permanently deleted when you save the
              layout.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={undoDelete}>
                Restore
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{value ? "Edit table" : "New table"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seats">Seats</Label>
              <Input
                id="seats"
                type="number"
                min="1"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              {value && (
                <>
                  <Button type="button" variant="destructive" disabled={busy} onClick={markDelete}>
                    Delete table
                  </Button>
                  <Button type="button" variant="outline" disabled={busy} onClick={duplicate}>
                    Duplicate
                  </Button>
                </>
              )}
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ObstacleEditModal({
  restaurantId,
  value,
  isPendingDelete,
  onMarkDelete,
  onUndoDelete,
  onClose,
}: {
  restaurantId: number;
  value: Obstacle | null;
  isPendingDelete: boolean;
  onMarkDelete: () => void;
  onUndoDelete: () => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(value?.label ?? "");
  // Raw text, not a number — see the same note on TableEditModal's `seats`.
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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {isPendingDelete && value ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>"{value.label}" will be deleted</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This obstacle will be permanently deleted when you save the layout.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={undoDelete}>
                Restore
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{value ? "Edit obstacle" : "New obstacle"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                placeholder="Bar, kitchen, entrance…"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="width">Width (% of room)</Label>
                <Input
                  id="width"
                  type="number"
                  min="5"
                  max="100"
                  value={widthPct}
                  onChange={(e) => setWidthPct(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (% of room)</Label>
                <Input
                  id="height"
                  type="number"
                  min="5"
                  max="100"
                  value={heightPct}
                  onChange={(e) => setHeightPct(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              {value && (
                <Button type="button" variant="destructive" disabled={busy} onClick={markDelete}>
                  Delete
                </Button>
              )}
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
