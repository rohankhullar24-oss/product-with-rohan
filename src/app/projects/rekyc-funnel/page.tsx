import type { Metadata } from "next";
import RekycFunnel from "@/components/RekycFunnel";

export const metadata: Metadata = {
  title: "Merchant Re-KYC Journey | Product with Rohan",
  description:
    "An interactive prototype of a merchant re-KYC flow: CKYC OTP or Aadhaar verification, shop details and photo capture, MCC confirmation, and completion.",
  keywords: ["re-KYC", "merchant onboarding", "KYC funnel", "product prototype", "fintech"],
  openGraph: {
    type: "website",
    url: "https://productwithrohan.online/projects/rekyc-funnel",
    title: "Merchant Re-KYC Journey",
    description:
      "An interactive prototype of a merchant re-KYC flow, from identity verification to shop confirmation.",
  },
};

export default function RekycFunnelPage() {
  return <RekycFunnel />;
}
