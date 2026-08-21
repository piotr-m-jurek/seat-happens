import { useSyncExternalStore } from "react";

// Three route shapes total — hand-rolled rather than pulling in a routing
// library, matching this project's bias toward minimal dependencies. Swap
// for a real router later if routing needs grow beyond this.
export type Route = { kind: "home" } | { kind: "admin" } | { kind: "restaurant"; slug: string };

function parseRoute(pathname: string): Route {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "admin") return { kind: "admin" };
  if (parts[0] === "r" && parts[1]) return { kind: "restaurant", slug: parts[1] };
  return { kind: "home" };
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  listeners.add(listener);
  return () => {
    window.removeEventListener("popstate", listener);
    listeners.delete(listener);
  };
}

function getPathSnapshot() {
  return window.location.pathname;
}

function getSearchSnapshot() {
  return window.location.search;
}

export function navigate(path: string) {
  if (path === window.location.pathname) return;
  window.history.pushState(null, "", path);
  listeners.forEach((l) => l());
}

export function useRoute(): Route {
  const pathname = useSyncExternalStore(subscribe, getPathSnapshot);
  return parseRoute(pathname);
}

// One-shot read, for seeding initial state at module/atom init time —
// before React (and useSearchParam below) is even running yet.
export function getSearchParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

export function useSearchParam(name: string): string | null {
  const search = useSyncExternalStore(subscribe, getSearchSnapshot);
  return new URLSearchParams(search).get(name);
}

// Query params represent view state (which date you're looking at), not a
// navigation you'd want undone with the back button, so this replaces
// rather than pushes.
export function setSearchParam(name: string, value: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (value === null) {
    params.delete(name);
  } else {
    params.set(name, value);
  }
  const search = params.toString();
  window.history.replaceState(null, "", window.location.pathname + (search ? `?${search}` : ""));
  listeners.forEach((l) => l());
}
