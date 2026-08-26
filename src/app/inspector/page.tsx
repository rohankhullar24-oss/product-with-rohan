import type { Metadata } from "next";
import InspectorCopilot from "./InspectorCopilot";

export const metadata: Metadata = {
  title: "CarBecho Inspection Co-Pilot",
  description:
    "A hands-free voice assistant for field inspectors running a 200-point used-car inspection. Speak the fault, hear the call.",
  // Unlisted: reachable by direct link only, not in the sitemap or nav.
  robots: { index: false, follow: false },
};

export default function InspectorPage() {
  return <InspectorCopilot />;
}
