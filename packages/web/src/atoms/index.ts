import type { Session, Staff, Table } from "@sit-happens/shared";
import * as Atom from "effect/unstable/reactivity/Atom";
import { authRepo } from "../data/authRepo";
import { floorPlanRepo } from "../data/floorPlanRepo";
import { obstaclesRepo } from "../data/obstaclesRepo";
import { reservationsRepo } from "../data/reservationsRepo";
import { tablesRepo } from "../data/tablesRepo";
import { todayISO } from "../lib/reservations";
import { collectionAtom, pushAtom } from "./collection";

export const tablesAtom = collectionAtom<Table>(tablesRepo);
export const obstaclesAtom = collectionAtom(obstaclesRepo);
export const floorPlanAtom = pushAtom(
  () => floorPlanRepo.get(),
  (cb) => floorPlanRepo.subscribe(cb)
);

// One atom per date, memoized — switching dates reuses the atom if you
// come back to a date already seen this session, and each holds its own
// realtime subscription independent of the others.
export const reservationsAtom = Atom.family((date: string) =>
  collectionAtom({
    list: () => reservationsRepo.listByDate(date),
    subscribe: (cb: (items: Awaited<ReturnType<typeof reservationsRepo.listByDate>>) => void) =>
      reservationsRepo.subscribeByDate(date, cb),
  })
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

export const selectedDateAtom = Atom.make(todayISO());
export const selectedTableIdAtom = Atom.make<number | null>(null);
export const viewAtom = Atom.make<"floor" | "agenda" | "layout">("floor");
