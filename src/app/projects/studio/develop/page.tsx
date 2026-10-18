import type { Metadata } from "next";
import ClientOnly from "@/components/studio/ClientOnly";
import DevelopApp from "@/components/studio/DevelopApp";

export const metadata: Metadata = {
  title: "Develop | Open Studio",
  description:
    "A free, Lightroom-lite photo library and developer in your browser: ratings and picks, white balance, exposure and tone, tone curve, HSL mixer, histogram and batch export.",
};

export default function DevelopPage() {
  return (
    <ClientOnly>
      <DevelopApp />
    </ClientOnly>
  );
}
