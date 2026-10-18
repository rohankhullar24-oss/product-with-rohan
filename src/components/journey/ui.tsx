"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

// Shared bits for the /journey pages, matching the styling the journal and
// trips pages already use inline.

export const inputCls =
  "rounded-lg border border-slate/25 bg-transparent px-3 py-2 text-sm text-navy outline-none focus:border-accent dark:text-foreground";
export const primaryBtn =
  "rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60";
export const ghostBtn =
  "rounded-full border border-slate/25 px-4 py-2 text-sm font-medium text-slate hover:border-accent hover:text-accent disabled:opacity-60";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-navy dark:text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>;
}

export function Modal({ title, onClose, children, footer, style }: {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  style?: React.CSSProperties;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-background shadow-xl sm:rounded-2xl"
        style={style}
      >
        {title && <h2 className="px-5 pt-5 text-lg font-semibold text-navy dark:text-foreground">{title}</h2>}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center gap-2 border-t border-slate/15 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
