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

function getSnapshot() {
  return window.location.pathname;
}

export function navigate(path: string) {
  if (path === window.location.pathname) return;
  window.history.pushState(null, "", path);
  listeners.forEach((l) => l());
}

export function useRoute(): Route {
  const pathname = useSyncExternalStore(subscribe, getSnapshot);
  return parseRoute(pathname);
}
