"use client";

import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";

const subscribe = () => () => {};

/**
 * The studio apps are canvas/DOM tools with nothing useful to server-render,
 * and several measure text with the DOM while rendering, so they mount on the
 * client only.
 */
export default function ClientOnly({ children }: { children: ReactNode }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  if (!isClient) {
    return <div className="flex h-[70vh] items-center justify-center text-sm text-slate-500">Loading editor…</div>;
  }
  return children;
}
