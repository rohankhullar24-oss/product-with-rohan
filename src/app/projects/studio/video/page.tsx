import type { Metadata } from "next";
import ClientOnly from "@/components/studio/ClientOnly";
import VideoApp from "@/components/studio/VideoApp";

export const metadata: Metadata = {
  title: "Video | Open Studio",
  description:
    "A free, Premiere-lite video editor in your browser: multi-track timeline with overlays, titles and music, trim, split, fades, markers and WebM export.",
};

export default function VideoPage() {
  return (
    <ClientOnly>
      <VideoApp />
    </ClientOnly>
  );
}
