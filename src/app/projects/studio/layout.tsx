import type { ReactNode } from "react";
import StudioNav from "@/components/studio/StudioNav";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <StudioNav />
      {children}
    </div>
  );
}
