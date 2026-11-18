import { useSyncExternalStore } from "react";

const noop = () => () => {};
/** false during SSR and hydration, true after — gate anything read from localStorage. */
export function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}
