import type { Metadata } from "next";
import ClientOnly from "@/components/studio/ClientOnly";
import SlidesApp from "@/components/studio/SlidesApp";

export const metadata: Metadata = {
  title: "Slides | Open Studio",
  description:
    "A free, PowerPoint-lite outliner in your browser: open .pptx decks, edit slide titles and bullets, pick a theme and save a real .pptx. Nothing is uploaded.",
};

export default function SlidesPage() {
  return (
    <ClientOnly>
      <SlidesApp />
    </ClientOnly>
  );
}
