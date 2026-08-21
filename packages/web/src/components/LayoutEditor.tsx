import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Obstacle, Table } from "@sit-happens/shared";
import { useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
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
  onClick: () => void
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

  return { rect, onPointerDown, onPointerMove, onPointerUp, onResizePointerDown, onResizePointerMove, onResizePointerUp };
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
  canvasRef,
  onEdit,
}: {
  table: Table;
  canvasRef: RefObject<HTMLDivElement | null>;
  onEdit: () => void;
}) {
  const tableRect: Rect = { x: table.x, y: table.y, width: table.width, height: table.height };
  const {
    rect,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp,
  } = useDragAndResize(
    tableRect,
    canvasRef,
    (r) => tablesRepo.update(table.id, { x: r.x, y: r.y }),
    (r) => tablesRepo.update(table.id, r),
    onEdit
  );

  return (
    <button
      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-border bg-card shadow-sm"
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.width * 100}%`,
        height: `${rect.height * 100}%`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <span className="font-semibold">{table.name}</span>
      <span className="text-xs text-muted-foreground">{table.seats} seats</span>
      <ResizeHandle
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
      />
    </button>
  );
}

function LayoutObstacleNode({
  obstacle,
  canvasRef,
  onEdit,
}: {
  obstacle: Obstacle;
  canvasRef: RefObject<HTMLDivElement | null>;
  onEdit: () => void;
}) {
  const obstacleRect: Rect = { x: obstacle.x, y: obstacle.y, width: obstacle.width, height: obstacle.height };
  const {
    rect,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp,
  } = useDragAndResize(
    obstacleRect,
    canvasRef,
    (r) => obstaclesRepo.update(obstacle.id, { x: r.x, y: r.y }),
    (r) => obstaclesRepo.update(obstacle.id, r),
    onEdit
  );

  return (
    <button
      className="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/40 bg-muted/60 text-sm text-muted-foreground"
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.width * 100}%`,
        height: `${rect.height * 100}%`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {obstacle.label}
      <ResizeHandle
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
      />
    </button>
  );
}

type Editing =
  | { kind: "table"; value: Table | null }
  | { kind: "obstacle"; value: Obstacle | null }
  | null;

const MIN_ROOM_UNITS = 1.5;

export function LayoutEditor({ restaurantId }: { restaurantId: number }) {
  const tables = useCollection(tablesAtom(restaurantId));
  const obstacles = useCollection(obstaclesAtom(restaurantId));
  const floorPlan = useAsyncValue(floorPlanAtom(restaurantId), { width: 4, height: 3 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<Editing>(null);

  const [liveSize, setLiveSize] = useState(floorPlan);
  const resizingRoom = useRef(false);
  const roomStart = useRef({ x: 0, y: 0 });
  const roomStartSize = useRef(floorPlan);
  const pxPerUnit = useRef({ x: 1, y: 1 });
  const displaySize = resizingRoom.current ? liveSize : floorPlan;

  function onRoomResizePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const box = canvas.getBoundingClientRect();
    resizingRoom.current = true;
    roomStart.current = { x: e.clientX, y: e.clientY };
    roomStartSize.current = floorPlan;
    pxPerUnit.current = { x: box.width / floorPlan.width, y: box.height / floorPlan.height };
    setLiveSize(floorPlan);
  }

  function onRoomResizePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!resizingRoom.current) return;
    const dx = e.clientX - roomStart.current.x;
    const dy = e.clientY - roomStart.current.y;
    const width = Math.max(MIN_ROOM_UNITS, roomStartSize.current.width + dx / pxPerUnit.current.x);
    const height = Math.max(MIN_ROOM_UNITS, roomStartSize.current.height + dy / pxPerUnit.current.y);
    setLiveSize({ width, height });
  }

  async function onRoomResizePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (!resizingRoom.current) return;
    resizingRoom.current = false;
    await floorPlanRepo.update(restaurantId, liveSize);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Floor layout</h2>
        <div className="flex gap-2">
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
            canvasRef={canvasRef}
            onEdit={() => setEditing({ kind: "obstacle", value: obstacle })}
          />
        ))}
        {tables.map((table) => (
          <LayoutTableNode
            key={table.id}
            table={table}
            canvasRef={canvasRef}
            onEdit={() => setEditing({ kind: "table", value: table })}
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
        <TableEditModal restaurantId={restaurantId} value={editing.value} onClose={() => setEditing(null)} />
      )}
      {editing?.kind === "obstacle" && (
        <ObstacleEditModal restaurantId={restaurantId} value={editing.value} onClose={() => setEditing(null)} />
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
  onClose,
}: {
  restaurantId: number;
  value: Table | null;
  onClose: () => void;
}) {
  const tables = useCollection(tablesAtom(restaurantId));
  const [name, setName] = useState(value?.name ?? "");
  const [seats, setSeats] = useState(value?.seats ?? 2);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (value) {
        await tablesRepo.update(value.id, { name, seats });
      } else {
        await tablesRepo.create(restaurantId, { name, seats, x: 0.5, y: 0.5, width: 0.18, height: 0.2 });
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
          value.name
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

  async function remove() {
    if (!value || !confirm(`Delete ${value.name}? This also removes its reservations.`)) return;
    setBusy(true);
    try {
      await tablesRepo.remove(value.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete table.");
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
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
              onChange={(e) => setSeats(Number(e.target.value))}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            {value && (
              <>
                <Button type="button" variant="destructive" disabled={busy} onClick={remove}>
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
      </DialogContent>
    </Dialog>
  );
}

function ObstacleEditModal({
  restaurantId,
  value,
  onClose,
}: {
  restaurantId: number;
  value: Obstacle | null;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(value?.label ?? "");
  const [widthPct, setWidthPct] = useState(Math.round((value?.width ?? 0.2) * 100));
  const [heightPct, setHeightPct] = useState(Math.round((value?.height ?? 0.2) * 100));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const width = widthPct / 100;
      const height = heightPct / 100;
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

  async function remove() {
    if (!value || !confirm(`Delete "${value.label}"?`)) return;
    setBusy(true);
    try {
      await obstaclesRepo.remove(value.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete obstacle.");
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
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
                onChange={(e) => setWidthPct(Number(e.target.value))}
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
                onChange={(e) => setHeightPct(Number(e.target.value))}
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            {value && (
              <Button type="button" variant="destructive" disabled={busy} onClick={remove}>
                Delete
              </Button>
            )}
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
