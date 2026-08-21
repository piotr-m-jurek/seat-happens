import { useAtomValue } from "@effect/atom-react";
import { Effect, Queue, Stream } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";

// Bridges a one-shot fetch() + push-based subscribe(cb) pair — the shape
// every repo in data/*Repo.ts follows — into an Effect Stream: emits the
// initial fetch, then every subsequent push, and unsubscribes when the
// atom's scope closes (component unmounts / atom becomes unused).
export function pushStream<T>(fetch: () => Promise<T>, subscribe: (cb: (value: T) => void) => () => void): Stream.Stream<T, unknown> {
  return Stream.callback<T, unknown>((queue) =>
    Effect.gen(function* () {
      const initial = yield* Effect.tryPromise(fetch);
      Queue.offerUnsafe(queue, initial);
      const unsubscribe = subscribe((value) => {
        Queue.offerUnsafe(queue, value);
      });
      yield* Effect.addFinalizer(() => Effect.sync(unsubscribe));
    })
  );
}

export function pushAtom<T>(
  fetch: () => Promise<T>,
  subscribe: (cb: (value: T) => void) => () => void
): Atom.Atom<AsyncResult.AsyncResult<T, unknown>> {
  return Atom.make(pushStream(fetch, subscribe));
}

export interface CollectionRepo<T> {
  list(): Promise<T[]>;
  subscribe(cb: (items: T[]) => void): () => void;
}

export function collectionAtom<T>(repo: CollectionRepo<T>): Atom.Atom<AsyncResult.AsyncResult<T[], unknown>> {
  return pushAtom(() => repo.list(), (cb) => repo.subscribe(cb));
}

// Most call sites in this app never showed loading/error UI for these
// values (they just rendered empty/default until data arrived), so this
// collapses the AsyncResult back to a plain value — getOrElse keeps the
// last good value during a refresh/reconnect instead of flashing empty.
export function useAsyncValue<T>(atom: Atom.Atom<AsyncResult.AsyncResult<T, unknown>>, fallback: T): T {
  const result = useAtomValue(atom);
  return AsyncResult.getOrElse(result, () => fallback);
}

export function useCollection<T>(atom: Atom.Atom<AsyncResult.AsyncResult<T[], unknown>>): T[] {
  return useAsyncValue(atom, []);
}
