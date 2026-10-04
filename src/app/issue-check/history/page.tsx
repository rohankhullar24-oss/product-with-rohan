import type { Metadata } from "next";
import HistoryView from "./HistoryView";

export const metadata: Metadata = {
  title: "Issue Check history",
  description: "Every photo and video checked by Issue Check, newest first.",
  robots: { index: false, follow: false },
};

export default function IssueCheckHistoryPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <HistoryView />
    </main>
  );
}
