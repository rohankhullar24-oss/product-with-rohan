import type { Metadata } from "next";
import CommissionPayout from "@/components/CommissionPayout";

export const metadata: Metadata = {
  title: "Commission Payout Automation | Product with Rohan",
  description:
    "How commission payouts at a fintech organization moved off manual processing: ₹117L+ a month automated across six products, then ₹8.5L+ more across three, new-use-case onboarding cut from 30+ to 10 days, and ₹5-6L a month unlocked by automated reconciliation.",
  keywords: ["commission payouts", "payout automation", "reconciliation", "fintech", "product management"],
  openGraph: {
    type: "website",
    url: "https://productwithrohan.online/projects/commission-payout-automation",
    title: "Commission Payout Automation",
    description:
      "₹117L+ in monthly payouts automated across six products, and onboarding for a new use case cut from 30+ days to 10.",
  },
};

export default function CommissionPayoutPage() {
  return (
    <main className="flex-1">
      <CommissionPayout />
    </main>
  );
}
