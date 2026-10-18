import type { Metadata } from "next";
import ClientOnly from "@/components/studio/ClientOnly";
import PhotoApp from "@/components/studio/PhotoApp";

export const metadata: Metadata = {
  title: "Photo | Open Studio",
  description:
    "A free, Photoshop-lite photo editor that runs in your browser: layers with blend modes, brush and eraser, text, crop, rotate and non-destructive adjustments. Nothing is uploaded.",
};

export default function PhotoPage() {
  return (
    <ClientOnly>
      <PhotoApp />
    </ClientOnly>
  );
}
