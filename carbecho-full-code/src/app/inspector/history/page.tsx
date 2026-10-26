import type { Metadata } from "next";
import HistoryView from "./HistoryView";

export const metadata: Metadata = {
  title: "Findings log · CarBecho Inspection Co-Pilot",
  description: "Every finding logged by the inspection co-pilot, newest first.",
  robots: { index: false, follow: false },
};

export default function InspectorHistoryPage() {
  return <HistoryView />;
}
