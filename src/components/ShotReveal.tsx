"use client";

import { useState } from "react";
import { Markdown } from "@/components/Markdown";

export function ShotReveal({ answerMarkdown }: { answerMarkdown: string }) {
  const [revealed, setRevealed] = useState(false);

  if (!revealed) {
    return (
      <button
        onClick={() => setRevealed(true)}
        className="mt-8 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Reveal the answer
      </button>
    );
  }

  return (
    <div className="mt-8 rounded-xl border border-accent/30 bg-accent-light/40 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Answer</p>
      <Markdown content={answerMarkdown} />
    </div>
  );
}
