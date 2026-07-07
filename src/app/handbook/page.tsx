import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Product Manager Handbook | Free Download | Rohan Khullar",
  description:
    "A free, complete Product Manager handbook — five volumes covering PM foundations, product sense, execution, AI product management, and company interview guides. Download as PDF or Word.",
  openGraph: {
    type: "website",
    url: "https://productwithrohan.online/handbook",
    title: "The Product Manager Handbook | Rohan Khullar",
    description:
      "A free, complete Product Manager handbook — five volumes covering foundations, product sense, execution, AI product management, and company interview guides.",
  },
};

const volumes = [
  {
    numeral: "I",
    title: "Product Management Foundations",
    description:
      "The core discipline — what a PM does, discovery, prioritization, strategy, metrics, roadmaps, stakeholder management, PRDs, launches, and the operating rhythms that hold it together.",
    chapters: 16,
  },
  {
    numeral: "II",
    title: "Product Sense",
    description:
      "Frameworks and fully solved case studies — food delivery, maps, ride-hailing, fintech, healthcare, B2B SaaS, and AI products — plus mock interviews and 100 practice prompts to build judgment.",
    chapters: 29,
  },
  {
    numeral: "III",
    title: "Product Execution",
    description:
      "Turning strategy into shipped product — discovery, PRDs, user stories, roadmaps, Agile and sprint planning, analytics and experimentation, launches, post-launch reviews, and cross-functional leadership.",
    chapters: 16,
  },
  {
    numeral: "IV",
    title: "AI Product Management",
    description:
      "Building AI-native products — LLM fundamentals, prompt engineering, RAG, agents, MCP and tool use, evaluation frameworks, safety and governance, AI cost optimization, and a capstone project.",
    chapters: 16,
  },
  {
    numeral: "V",
    title: "Company Interview Guides",
    description:
      "Company-specific PM interview prep — Google, Meta, Amazon, Microsoft, Atlassian, Stripe, Airbnb, Uber, Revolut, CRED, PhonePe, Razorpay, Flipkart, Meesho — plus a full mock interview marathon.",
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
          Free download
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-navy dark:text-white sm:text-4xl">
          The Product Manager Handbook
        </h1>
        <p className="mt-3 max-w-2xl text-slate dark:text-slate-400">
          A complete guide from foundations to AI-native product leadership — five volumes,
          93 chapters, a glossary, an index, and a full set of PM templates and cheat sheets.
          Free to download, no email required.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/handbook/The-Product-Manager-Handbook.pdf"
            download
            className="rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent dark:bg-slate-700 dark:hover:bg-accent"
          >
            Download PDF
          </a>
          <a
            href="/handbook/The-Product-Manager-Handbook.docx"
            download
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-navy transition-colors hover:border-accent hover:text-accent dark:border-slate-600 dark:text-white dark:hover:border-accent dark:hover:text-accent"
          >
            Download Word (.docx)
          </a>
        </div>

        <section className="mt-14">
          <h2 className="text-lg font-semibold text-navy dark:text-white">What's inside</h2>
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
            Practical, reusable reference material to keep on hand after you've read the book.
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
