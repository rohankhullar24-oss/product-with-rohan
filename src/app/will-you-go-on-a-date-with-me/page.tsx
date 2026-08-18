import type { Metadata } from "next";
import DateInvite from "@/components/DateInvite";

export const metadata: Metadata = {
  title: "Will You Go On A Date With Me?",
  description: "A small question. Take your time.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DateInvitePage() {
  return <DateInvite />;
}
