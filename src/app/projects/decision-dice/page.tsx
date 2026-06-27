import type { Metadata } from "next";
import DecisionDice from "@/components/DecisionDice";

export const metadata: Metadata = {
  title: "Decision Dice | Beat Analysis Paralysis",
  description:
    "Break analysis paralysis: enter your options, answer priority questions, and get ranked recommendations with rationale. Perfect for career, product, and life decisions.",
  keywords: ["decision making", "decision tool", "analysis paralysis", "recommendation engine"],
  openGraph: {
    type: "website",
    url: "https://productwithrohan.online/projects/decision-dice",
    title: "Decision Dice | Beat Analysis Paralysis",
    description: "Get ranked recommendations for your toughest decisions.",
  },
};

export default function DecisionDicePage() {
  return (
    <main className="flex-1">
      <DecisionDice />
    </main>
  );
}
