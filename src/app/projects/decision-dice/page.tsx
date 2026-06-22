import type { Metadata } from "next";
import DecisionDice from "@/components/DecisionDice";

export const metadata: Metadata = {
  title: "Decision Dice | Product with Rohan",
  description:
    "A quick tool that helps you break analysis paralysis: enter your options, answer a couple of priority questions, and get a ranked recommendation with a rationale.",
};

export default function DecisionDicePage() {
  return (
    <main className="flex-1">
      <DecisionDice />
    </main>
  );
}
