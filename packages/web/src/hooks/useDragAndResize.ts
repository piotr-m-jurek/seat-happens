import { useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { Rect } from "../lib/geometry";

const DRAG_THRESHOLD_PX = 6;
const MIN_NODE_SIZE = 0.08;

// Shared by tables and obstacles: drag the whole shape to reposition, or
// drag its corner handle to resize (top-left corner stays anchored).
export function useDragAndResize(
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
