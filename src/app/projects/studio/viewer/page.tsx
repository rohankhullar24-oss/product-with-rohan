import type { Metadata } from "next";
import ClientOnly from "@/components/studio/ClientOnly";
import ViewerApp from "@/components/studio/ViewerApp";

export const metadata: Metadata = {
  title: "Viewer | Open Studio",
  description:
    "View Word, PowerPoint and Excel files in your browser the way Office shows them, with layout, images and colors. Read-only and nothing is uploaded.",
};

export default function ViewerPage() {
  return (
    <ClientOnly>
      <ViewerApp />
    </ClientOnly>
  );
}
