import type { Metadata } from "next";
import LeadGenPRD from "@/components/LeadGenPRD";

export const metadata: Metadata = {
  title: "Lead Generation PRD | Product with Rohan",
  description:
    "A detailed PRD for a retailer lead-generation and assignment funnel: problem statement, success metrics, form and website requirements, and field-agent app rollout.",
  keywords: ["PRD", "product requirements document", "lead generation", "product management"],
  openGraph: {
    type: "website",
    url: "https://productwithrohan.online/projects/lead-gen-prd",
    title: "Lead Generation PRD",
    description:
      "A detailed PRD for a retailer lead-generation and assignment funnel.",
  },
};

export default function LeadGenPRDPage() {
  return (
    <main className="flex-1">
      <LeadGenPRD />
    </main>
  );
}
