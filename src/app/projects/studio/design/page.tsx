import type { Metadata } from "next";
import ClientOnly from "@/components/studio/ClientOnly";
import DesignApp from "@/components/studio/DesignApp";

export const metadata: Metadata = {
  title: "Design | Open Studio",
  description:
    "A free, InDesign-lite page layout tool in your browser: multi-page documents, margins and column guides, snapping text and image frames, and real PDF export.",
};

export default function DesignPage() {
  return (
    <ClientOnly>
      <DesignApp />
    </ClientOnly>
  );
}
