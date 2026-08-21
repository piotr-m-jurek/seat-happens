import type { FloorPlanSize } from "@sit-happens/shared";
import { useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

const MIN_ROOM_UNITS = 1.5;

// Resize-only interaction for the room boundary handle — always grows/
// shrinks from the fixed top-left origin, so it doesn't share
// useDragAndResize's reposition-or-resize shape.
export function useRoomResize(
  roomSize: FloorPlanSize,
  canvasRef: RefObject<HTMLDivElement | null>,
  onResizeEnd: (size: FloorPlanSize) => void,
) {
  const [liveSize, setLiveSize] = useState(roomSize);
  const resizing = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const startSize = useRef(roomSize);
  const pxPerUnit = useRef({ x: 1, y: 1 });
  const displaySize = resizing.current ? liveSize : roomSize;

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const box = canvas.getBoundingClientRect();
    resizing.current = true;
    start.current = { x: e.clientX, y: e.clientY };
    startSize.current = roomSize;
    pxPerUnit.current = { x: box.width / roomSize.width, y: box.height / roomSize.height };
    setLiveSize(roomSize);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!resizing.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    const width = Math.max(MIN_ROOM_UNITS, startSize.current.width + dx / pxPerUnit.current.x);
    const height = Math.max(MIN_ROOM_UNITS, startSize.current.height + dy / pxPerUnit.current.y);
    setLiveSize({ width, height });
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (!resizing.current) return;
    resizing.current = false;
    onResizeEnd(liveSize);
  }

  return { displaySize, onPointerDown, onPointerMove, onPointerUp };
}
