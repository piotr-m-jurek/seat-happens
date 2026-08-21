import type { Session, Staff } from "@sit-happens/shared";
import { Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { authRepo } from "../data/authRepo";
import { floorPlanRepo } from "../data/floorPlanRepo";
import { obstaclesRepo } from "../data/obstaclesRepo";
import { reservationsRepo } from "../data/reservationsRepo";
import { restaurantsRepo } from "../data/restaurantsRepo";
import { staffRepo } from "../data/staffRepo";
import { tablesRepo } from "../data/tablesRepo";
import { todayISO } from "../lib/reservations";
import { collectionAtom, pushAtom } from "./collection";

// Every restaurant-scoped collection is a family keyed by restaurantId, so
// switching restaurants reuses an atom already seen this session and each
// restaurant's realtime subscription lives independently of the others —
// same pattern reservationsAtom already used for dates, one level up.
export const tablesAtom = Atom.family((restaurantId: number) =>
  collectionAtom({
    list: () => tablesRepo.list(restaurantId),
    subscribe: (cb: Parameters<typeof tablesRepo.subscribe>[1]) => tablesRepo.subscribe(restaurantId, cb),
  })
);

export const obstaclesAtom = Atom.family((restaurantId: number) =>
  collectionAtom({
    list: () => obstaclesRepo.list(restaurantId),
    subscribe: (cb: Parameters<typeof obstaclesRepo.subscribe>[1]) => obstaclesRepo.subscribe(restaurantId, cb),
  })
);

export const floorPlanAtom = Atom.family((restaurantId: number) =>
  pushAtom(
    () => floorPlanRepo.get(restaurantId),
    (cb) => floorPlanRepo.subscribe(restaurantId, cb)
  )
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
export const restaurantAtom = Atom.family((slug: string) => Atom.make(Effect.tryPromise(() => restaurantsRepo.getBySlug(slug))));
export const restaurantByIdAtom = Atom.family((id: number) => Atom.make(Effect.tryPromise(() => restaurantsRepo.getById(id))));
export const restaurantsListAtom = Atom.make(Effect.tryPromise(() => restaurantsRepo.list()));

export const staffListAtom = Atom.family((restaurantId: number) =>
  Atom.make(Effect.tryPromise(() => staffRepo.listForRestaurant(restaurantId)))
);
export const staffInvitesAtom = Atom.family((restaurantId: number) =>
  Atom.make(Effect.tryPromise(() => staffRepo.listInvitesForRestaurant(restaurantId)))
);

export const sessionAtom = pushAtom<Session | null>(
  () => authRepo.getSession(),
  (cb) => authRepo.onSessionChange(cb)
);

// Independent of sessionAtom rather than derived from it, to keep the
// dependency simple — re-fetches staff on every session change the same
// way sessionAtom re-fetches the session itself.
export const staffAtom = pushAtom<Staff | null>(
  () => authRepo.getSession().then((s) => (s ? authRepo.getStaff() : null)),
  (cb) => authRepo.onSessionChange((s) => (s ? authRepo.getStaff().then(cb) : cb(null)))
);

export const isSuperAdminAtom = pushAtom<boolean>(
  () => authRepo.getSession().then((s) => (s ? authRepo.isSuperAdmin() : false)),
  (cb) => authRepo.onSessionChange((s) => (s ? authRepo.isSuperAdmin().then(cb) : cb(false)))
);

export const selectedDateAtom = Atom.make(todayISO());
export const selectedTableIdAtom = Atom.make<number | null>(null);
export const viewAtom = Atom.make<"floor" | "agenda" | "layout" | "staff">("floor");
