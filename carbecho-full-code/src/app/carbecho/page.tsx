import type { Metadata } from "next";
import CarBechoFlow from "./CarBechoFlow";

export const metadata: Metadata = {
  title: "CarBecho — Interactive Inspection Flow",
  description:
    "A field inspector's 200-point used-car inspection with a Co-Pilot chat on every checklist row: type it, say it, photograph it, and mark the row from the answer.",
  // Unlisted: reachable by direct link only, not in the sitemap or nav.
  robots: { index: false, follow: false },
};

export default function CarBechoPage() {
  return <CarBechoFlow />;
}
