import type { Metadata } from "next";
import ClientOnly from "@/components/studio/ClientOnly";
import VectorApp from "@/components/studio/VectorApp";

export const metadata: Metadata = {
  title: "Vector | Open Studio",
  description:
    "A free, Illustrator-lite vector editor in your browser: pen and pencil, shapes, text, gradients, boolean operations, alignment, and SVG/PNG export.",
};

export default function VectorPage() {
  return (
    <ClientOnly>
      <VectorApp />
    </ClientOnly>
  );
}
