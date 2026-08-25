import type { FloorPlanSize, Session, Staff } from "@seat-happens/shared";
import { Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { authRepo } from "../data/authRepo";
import { floorPlanRepo } from "../data/floorPlanRepo";
import { obstaclesRepo } from "../data/obstaclesRepo";
import { reservationsRepo } from "../data/reservationsRepo";
import { restaurantsRepo } from "../data/restaurantsRepo";
import { staffRepo } from "../data/staffRepo";
import { tablesRepo } from "../data/tablesRepo";
import type { Rect } from "../lib/geometry";
import { todayISO } from "../lib/reservations";
import { getSearchParam } from "../lib/router";
import { initialTheme, type Theme } from "../lib/theme";
import { collectionAtom, pushAtom } from "./collection";

// Every restaurant-scoped collection is a family keyed by restaurantId, so
// switching restaurants reuses an atom already seen this session and each
// restaurant's realtime subscription lives independently of the others —
// same pattern reservationsAtom already used for dates, one level up.
export const tablesAtom = Atom.family((restaurantId: number) =>
  collectionAtom({
    list: () => tablesRepo.list(restaurantId),
    subscribe: (cb: Parameters<typeof tablesRepo.subscribe>[1]) =>
      tablesRepo.subscribe(restaurantId, cb),
  }),
);

export const obstaclesAtom = Atom.family((restaurantId: number) =>
  collectionAtom({
    list: () => obstaclesRepo.list(restaurantId),
    subscribe: (cb: Parameters<typeof obstaclesRepo.subscribe>[1]) =>
      obstaclesRepo.subscribe(restaurantId, cb),
  }),
);

export const floorPlanAtom = Atom.family((restaurantId: number) =>
  pushAtom(
    () => floorPlanRepo.get(restaurantId),
    (cb) => floorPlanRepo.subscribe(restaurantId, cb),
  ),
);

export function reservationsKey(restaurantId: number, date: string): string {
  return `${restaurantId}:${date}`;
}

export const reservationsAtom = Atom.family((key: string) => {
  const [restaurantId, date] = key.split(":");
  const id = Number(restaurantId);
  return collectionAtom({
    list: () => reservationsRepo.listByDate(id, date),
    subscribe: (cb: Parameters<typeof reservationsRepo.subscribeByDate>[2]) =>
      reservationsRepo.subscribeByDate(id, date, cb),
  });
});

// One-shot lookups (no realtime) — a restaurant's own slug/name rarely
// changes, and the restaurant list is only read from the admin page, which
// re-triggers with useAtomRefresh after creating one.
export const restaurantAtom = Atom.family((slug: string) =>
  Atom.make(Effect.tryPromise(() => restaurantsRepo.getBySlug(slug))),
);
export const restaurantByIdAtom = Atom.family((id: number) =>
  Atom.make(Effect.tryPromise(() => restaurantsRepo.getById(id))),
);
export const restaurantsListAtom = Atom.make(Effect.tryPromise(() => restaurantsRepo.list()));

export const staffListAtom = Atom.family((restaurantId: number) =>
  Atom.make(Effect.tryPromise(() => staffRepo.listForRestaurant(restaurantId))),
);
export const staffInvitesAtom = Atom.family((restaurantId: number) =>
  Atom.make(Effect.tryPromise(() => staffRepo.listInvitesForRestaurant(restaurantId))),
);

export const sessionAtom = pushAtom<Session | null>(
  () => authRepo.getSession(),
  (cb) => authRepo.onSessionChange(cb),
);

// Independent of sessionAtom rather than derived from it, to keep the
// dependency simple — re-fetches staff on every session change the same
// way sessionAtom re-fetches the session itself. One person can have a
// membership at more than one restaurant, so this is an array.
export const staffMembershipsAtom = pushAtom<Staff[]>(
  () => authRepo.getSession().then((s) => (s ? authRepo.getStaffMemberships() : [])),
  (cb) => authRepo.onSessionChange((s) => (s ? authRepo.getStaffMemberships().then(cb) : cb([]))),
);

export const isSuperAdminAtom = pushAtom<boolean>(
  () => authRepo.getSession().then((s) => (s ? authRepo.isSuperAdmin() : false)),
  (cb) => authRepo.onSessionChange((s) => (s ? authRepo.isSuperAdmin().then(cb) : cb(false))),
);

// Seeded from ?date= if present in the URL on load (so a shared/reloaded
// link lands on the right day), otherwise today. Going forward the URL is
// kept in sync with this atom, not the other way — see the effect in
// AppShell.tsx.
function initialSelectedDate(): string {
  const param = getSearchParam("date");
  return param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : todayISO();
}

export const selectedDateAtom = Atom.make(initialSelectedDate());
export const selectedTableIdAtom = Atom.make<number | null>(null);
export type View = "floor" | "agenda" | "timeline" | "layout" | "staff" | "settings";
export const viewAtom = Atom.make<View>("floor");
export const themeAtom = Atom.make<Theme>(initialTheme());

// Local unsaved edits from the Layout tab (position/size/deletion) — kept
// as an atom rather than component state so switching away from the
// Layout tab and back (AppShell unmounts LayoutEditor entirely on view
// change) doesn't silently discard them.
export interface LayoutDraft {
  tables: Record<number, Rect>;
  obstacles: Record<number, Rect>;
  roomSize: FloorPlanSize | null;
  deletedTables: Record<number, true>;
  deletedObstacles: Record<number, true>;
}

const emptyLayoutDraft: LayoutDraft = {
  tables: {},
  obstacles: {},
  roomSize: null,
  deletedTables: {},
  deletedObstacles: {},
};

export const layoutDraftAtom = Atom.family((_restaurantId: number) => Atom.make(emptyLayoutDraft));
