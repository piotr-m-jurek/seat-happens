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
import type { Obstacle, Table } from "@sit-happens/shared";
import { useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { useDragAndResize } from "../hooks/useDragAndResize";
import { useLayoutDraft } from "../hooks/useLayoutDraft";
import { useObstacleForm } from "../hooks/useObstacleForm";
import { useRoomResize } from "../hooks/useRoomResize";
import { useTableForm } from "../hooks/useTableForm";
import type { Rect } from "../lib/geometry";
import { floorPlanCanvasStyle } from "../lib/reservations";

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

export function LayoutEditor({ restaurantId }: { restaurantId: number }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<Editing>(null);

  const {
    tables,
    obstacles,
    roomSize,
    isDirty,
    saving,
    saveError,
    save,
    getTableRect,
    isTablePendingDelete,
    setTableDraftRect,
    markTableDeleted,
    undoTableDelete,
    getObstacleRect,
    isObstaclePendingDelete,
    setObstacleDraftRect,
    markObstacleDeleted,
    undoObstacleDelete,
    setRoomDraftSize,
  } = useLayoutDraft(restaurantId);

  const {
    displaySize,
    onPointerDown: onRoomResizePointerDown,
    onPointerMove: onRoomResizePointerMove,
    onPointerUp: onRoomResizePointerUp,
  } = useRoomResize(roomSize, canvasRef, setRoomDraftSize);

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
            <Button onClick={save} disabled={saving}>
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
            draftRect={getObstacleRect(obstacle.id)}
            isPendingDelete={isObstaclePendingDelete(obstacle.id)}
            canvasRef={canvasRef}
            onEdit={() => setEditing({ kind: "obstacle", value: obstacle })}
            onChangeDraft={(rect) => setObstacleDraftRect(obstacle.id, rect)}
          />
        ))}
        {tables.map((table) => (
          <LayoutTableNode
            key={table.id}
            table={table}
            draftRect={getTableRect(table.id)}
            isPendingDelete={isTablePendingDelete(table.id)}
            canvasRef={canvasRef}
            onEdit={() => setEditing({ kind: "table", value: table })}
            onChangeDraft={(rect) => setTableDraftRect(table.id, rect)}
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
          isPendingDelete={editing.value !== null && isTablePendingDelete(editing.value.id)}
          onMarkDelete={() => editing.value && markTableDeleted(editing.value.id)}
          onUndoDelete={() => editing.value && undoTableDelete(editing.value.id)}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === "obstacle" && (
        <ObstacleEditModal
          restaurantId={restaurantId}
          value={editing.value}
          isPendingDelete={editing.value !== null && isObstaclePendingDelete(editing.value.id)}
          onMarkDelete={() => editing.value && markObstacleDeleted(editing.value.id)}
          onUndoDelete={() => editing.value && undoObstacleDelete(editing.value.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
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
  const { name, setName, seats, setSeats, error, busy, save, duplicate, markDelete, undoDelete } =
    useTableForm(restaurantId, value, onMarkDelete, onUndoDelete, onClose);

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
  const {
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
  } = useObstacleForm(restaurantId, value, onMarkDelete, onUndoDelete, onClose);

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
