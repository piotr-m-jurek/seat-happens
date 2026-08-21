import type { FloorPlanSize, Obstacle, Reservation, Session, Staff, Table } from "@sit-happens/shared";
import { useSyncExternalStore, type CSSProperties } from "react";
import { authRepo } from "./data/authRepo";
import { floorPlanRepo } from "./data/floorPlanRepo";
import { obstaclesRepo } from "./data/obstaclesRepo";
import { reservationsRepo } from "./data/reservationsRepo";
import { tablesRepo } from "./data/tablesRepo";

export function todayISO(): string {
  // Local date, not UTC — the tablet's clock is the restaurant's actual
  // local time, and toISOString() would show the wrong day near midnight.
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface State {
  session: Session | null;
  staff: Staff | null;
  authReady: boolean;
  selectedDate: string;
  tables: Table[];
  obstacles: Obstacle[];
  floorPlan: FloorPlanSize;
  reservations: Reservation[];
  selectedTableId: number | null;
  view: "floor" | "agenda" | "layout";
}

let state: State = {
  session: null,
  staff: null,
  authReady: false,
  selectedDate: todayISO(),
  tables: [],
  obstacles: [],
  floorPlan: { width: 4, height: 3 },
  reservations: [],
  selectedTableId: null,
  view: "floor",
};

const listeners = new Set<() => void>();

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

// Both FloorPlan and LayoutEditor render the room canvas through this one
// function so a position/size set in one always maps to the same spot in
// the other — the room's stored width/height is a ratio + relative
// magnitude in arbitrary "room units", not real pixels.
const FLOOR_PLAN_SCALE = 144; // px per room-unit
const FLOOR_PLAN_MIN_PX = 240;
const FLOOR_PLAN_MAX_PX = 960;

export function floorPlanCanvasStyle(size: FloorPlanSize): CSSProperties {
  const width = Math.min(FLOOR_PLAN_MAX_PX, Math.max(FLOOR_PLAN_MIN_PX, size.width * FLOOR_PLAN_SCALE));
  return { width: `${width}px`, aspectRatio: `${size.width} / ${size.height}` };
}

export function reservationsForTable(reservations: Reservation[], tableId: number): Reservation[] {
  return reservations
    .filter((r) => r.tableId === tableId)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

// Postgres `time` columns come back over the wire as "HH:MM:SS" — this is
// the one place that gets trimmed to "HH:MM" for display.
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function addMinutes(time: string, minutes: number): string {
  const total = (toMinutes(time) + minutes + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeRangesOverlap(aStart: string, aDuration: number, bStart: string, bDuration: number): boolean {
  const aFrom = toMinutes(aStart);
  const bFrom = toMinutes(bStart);
  return aFrom < bFrom + bDuration && bFrom < aFrom + aDuration;
}

// Other reservations for the same table/date whose time range overlaps the
// given one — used to warn about (not block) double-booking a table.
export function overlappingReservations(
  reservations: Reservation[],
  tableId: number,
  date: string,
  startTime: string,
  durationMin: number,
  excludeId?: number
): Reservation[] {
  return reservationsForTable(reservations, tableId).filter(
    (r) =>
      r.id !== excludeId &&
      r.date === date &&
      timeRangesOverlap(r.startTime, r.durationMin, startTime, durationMin)
  );
}

let unsubscribeTables: (() => void) | null = null;
let unsubscribeObstacles: (() => void) | null = null;
let unsubscribeFloorPlan: (() => void) | null = null;
let unsubscribeReservations: (() => void) | null = null;

function loadTables() {
  unsubscribeTables?.();
  tablesRepo.list().then((t) => setState({ tables: t })).catch(console.error);
  unsubscribeTables = tablesRepo.subscribe((t) => setState({ tables: t }));
}

function loadObstacles() {
  unsubscribeObstacles?.();
  obstaclesRepo.list().then((o) => setState({ obstacles: o })).catch(console.error);
  unsubscribeObstacles = obstaclesRepo.subscribe((o) => setState({ obstacles: o }));
}

function loadFloorPlan() {
  unsubscribeFloorPlan?.();
  floorPlanRepo.get().then((size) => setState({ floorPlan: size })).catch(console.error);
  unsubscribeFloorPlan = floorPlanRepo.subscribe((size) => setState({ floorPlan: size }));
}

function loadReservations(date: string) {
  unsubscribeReservations?.();
  reservationsRepo.listByDate(date).then((r) => setState({ reservations: r })).catch(console.error);
  unsubscribeReservations = reservationsRepo.subscribeByDate(date, (r) => setState({ reservations: r }));
}

export function setSelectedDate(date: string) {
  setState({ selectedDate: date });
  loadReservations(date);
}

export function setSelectedTableId(id: number | null) {
  setState({ selectedTableId: id });
}

export function setView(view: State["view"]) {
  setState({ view });
}

let initialized = false;

export function initAuth() {
  if (initialized) return;
  initialized = true;

  async function onSession(s: Session | null) {
    setState({ session: s, staff: s ? await authRepo.getStaff() : null, authReady: true });
    if (s) {
      loadTables();
      loadObstacles();
      loadFloorPlan();
      loadReservations(state.selectedDate);
    } else {
      unsubscribeTables?.();
      unsubscribeObstacles?.();
      unsubscribeFloorPlan?.();
      unsubscribeReservations?.();
      setState({ tables: [], obstacles: [], floorPlan: { width: 4, height: 3 }, reservations: [] });
    }
  }

  authRepo.getSession().then(onSession);
  authRepo.onSessionChange(onSession);
}

export async function signOut() {
  await authRepo.signOut();
  setSelectedTableId(null);
  setView("floor");
}
