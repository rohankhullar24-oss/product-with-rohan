import type { Metadata, Viewport } from "next";
import IssueCheck from "./IssueCheck";

export const metadata: Metadata = {
  title: "Issue Check",
  description: "Photo or video in, car part and issue to mark out.",
  // Unlisted internal tool: reachable by direct link only.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function IssueCheckPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <IssueCheck />
    </main>
  );
}
