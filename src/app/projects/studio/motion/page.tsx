import type { Metadata } from "next";
import ClientOnly from "@/components/studio/ClientOnly";
import MotionApp from "@/components/studio/MotionApp";

export const metadata: Metadata = {
  title: "Motion | Open Studio",
  description:
    "A free, After Effects-lite motion graphics tool in your browser: text, shape and image layers, keyframes with easing, animation presets and WebM export.",
};

export default function MotionPage() {
  return (
    <ClientOnly>
      <MotionApp />
    </ClientOnly>
  );
}
