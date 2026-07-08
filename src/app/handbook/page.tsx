import Link from "next/link";
import { Metadata } from "next";
import HandbookCheckout from "@/components/HandbookCheckout";

export const metadata: Metadata = {
  title: "The Product Manager Handbook | Rohan Khullar",
  description:
    "A complete Product Manager handbook — five volumes covering PM foundations, product sense, execution, AI product management, and company interview guides. Pay what you want, starting at ₹1.",
  openGraph: {
    type: "website",
    url: "https://productwithrohan.online/handbook",
    title: "The Product Manager Handbook | Rohan Khullar",
    description:
      "A complete Product Manager handbook — five volumes covering foundations, product sense, execution, AI product management, and company interview guides. Pay what you want, starting at ₹1.",
  },
};

const volumes = [
  {
    numeral: "I",
    title: "Product Management Foundations",
    description:
      "The core discipline of product management — the PM mindset, customer research, prioritization, strategy, metrics, roadmaps, stakeholder management, PRDs, launches, and the operating habits that separate good PMs from great ones.",
    chapters: 16,
  },
  {
    numeral: "II",
    title: "Product Sense",
    description:
      "A practical, case-study-driven training ground for product sense — a structured framework plus more than twenty worked case studies (food delivery, maps, fintech, healthcare, B2B SaaS, AI products) and executive-level mock interviews.",
    chapters: 29,
  },
  {
    numeral: "III",
    title: "Product Execution",
    description:
      "The operational backbone of shipping product — discovery and validation, prioritization, PRDs, agile delivery, analytics, experimentation, launches, and cross-functional leadership.",
    chapters: 16,
  },
  {
    numeral: "IV",
    title: "AI Product Management",
    description:
      "A ground-up guide to building AI-native products — LLM fundamentals, prompt engineering, RAG, agents, MCP and tool use, evaluation, safety and governance, cost optimization, and real AI product case studies.",
    chapters: 16,
  },
  {
    numeral: "V",
    title: "Company Interview Guides",
    description:
      "Company-specific interview playbooks — Google, Meta, Amazon, Microsoft, Atlassian, Stripe, Airbnb, Uber, Revolut, CRED, PhonePe, Razorpay, Flipkart, and Meesho — capped with a full mock interview marathon.",
    chapters: 16,
  },
];

const appendices = [
  "100 PM Frameworks",
  "PRD Templates",
  "Roadmap Templates",
  "KPI Library",
  "SQL Cheat Sheets",
  "AI Prompt Library",
  "Interview Checklists",
  "Resume Templates",
];

export default function HandbookPage() {
  return (
    <main className="flex-1 bg-white dark:bg-slate-950 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Back to home
        </Link>

        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-accent">
          Pay what you want
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-navy dark:text-white sm:text-4xl">
          The Product Manager Handbook
        </h1>
        <p className="mt-3 max-w-2xl text-slate dark:text-slate-400">
          A complete guide from foundations to AI-native product leadership — five volumes,
          93 chapters, a glossary, an index, and a full set of PM templates and cheat sheets.
          337 pages. Pay what you want — starting at ₹1.
        </p>

        <HandbookCheckout />

        <section className="mt-14">
          <h2 className="text-lg font-semibold text-navy dark:text-white">What&apos;s inside</h2>
          <ul className="mt-4 grid gap-x-8 gap-y-2 text-sm text-slate dark:text-slate-400 sm:grid-cols-2">
            <li>Five complete volumes, 93 chapters</li>
            <li>Cover, copyright, dedication &amp; foreword</li>
            <li>Preface and how-to-use guide</li>
            <li>About the author</li>
            <li>Automatic table of contents</li>
            <li>Running headers &amp; page numbers</li>
            <li>Numbered figures and tables</li>
            <li>Full glossary and index</li>
            <li>Appendices — frameworks, templates, prompts</li>
            <li>Company-specific interview guides</li>
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="text-lg font-semibold text-navy dark:text-white">The five volumes</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {volumes.map((volume) => (
              <div
                key={volume.numeral}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  Volume {volume.numeral} · {volume.chapters} chapters
                </p>
                <h3 className="mt-2 text-lg font-semibold text-navy dark:text-white">
                  {volume.title}
                </h3>
                <p className="mt-2 text-sm text-slate dark:text-slate-400">
                  {volume.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-lg font-semibold text-navy dark:text-white">Appendices</h2>
          <p className="mt-2 text-sm text-slate dark:text-slate-400">
            Practical, reusable reference material to keep on hand after you&apos;ve read the book.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {appendices.map((item) => (
              <span
                key={item}
                className="rounded-full bg-accent-light px-3 py-1 text-xs font-medium text-navy dark:bg-slate-800 dark:text-accent"
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-navy dark:text-white">A note on this edition</h2>
          <p className="mt-2 text-sm text-slate dark:text-slate-400">
            This is version 1.0 of the handbook. If you spot an error or have feedback, reach out
            via the{" "}
            <Link href="/#contact" className="text-accent hover:underline">
              contact section
            </Link>{" "}
            — future editions will incorporate reader corrections.
          </p>
        </section>
      </div>
    </main>
  );
}
