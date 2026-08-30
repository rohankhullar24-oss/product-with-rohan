import type { Metadata } from "next";
import AiDocVerification from "@/components/AiDocVerification";

export const metadata: Metadata = {
  title: "AI-Powered Document Verification | Product with Rohan",
  description:
    "How an automated shop-photo verification model closed a retry-until-approved fraud loophole in retailer onboarding, cutting manual review effort by 60%.",
  keywords: ["AI verification", "KYC", "fraud detection", "product management", "document verification"],
  openGraph: {
    type: "website",
    url: "https://productwithrohan.online/projects/ai-doc-verification",
    title: "AI-Powered Document Verification",
    description:
      "How an automated shop-photo verification model closed a retry-until-approved fraud loophole in retailer onboarding.",
  },
};

export default function AiDocVerificationPage() {
  return (
    <main className="flex-1">
      <AiDocVerification />
    </main>
  );
}
