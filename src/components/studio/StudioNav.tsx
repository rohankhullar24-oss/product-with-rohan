"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STUDIO_APPS } from "./apps";

export default function StudioNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center gap-1 overflow-x-auto px-3 py-2 sm:px-6">
        <Link href="/projects/studio" className="mr-2 shrink-0 text-sm font-bold text-white">
          Open <span className="text-accent">Studio</span>
        </Link>
        {STUDIO_APPS.map((a) => {
          const href = `/projects/studio/${a.slug}`;
          const on = pathname === href;
          return (
            <Link
              key={a.slug}
              href={href}
              title={`${a.name}: replaces ${a.replaces}`}
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                on ? "bg-accent text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {a.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
