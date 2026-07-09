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

const testimonials = [
  {
    rating: 5,
    name: "Aarav Mehta",
    role: "Associate Product Manager",
    quote:
      "I didn't expect a single handbook to cover so much without feeling overwhelming. The chapters build on each other, and I found myself highlighting pages throughout. It's become my go-to reference whenever I get stuck.",
  },
  {
    rating: 5,
    name: "Priya Sharma",
    role: "Product Manager",
    quote:
      "The examples and frameworks are what stood out to me. Instead of just explaining concepts, the handbook shows how to think like a product manager. I wish I'd had this when I started my career.",
  },
  {
    rating: 5,
    name: "Rahul Verma",
    role: "Aspiring Product Manager",
    quote:
      "I used the handbook while preparing for PM interviews, and it gave me a much more structured understanding of product management. It answered questions I didn't even know I had.",
  },
  {
    rating: 5,
    name: "Neha Kapoor",
    role: "Senior Product Manager",
    quote:
      "Even with years of experience, I found sections that challenged how I approach discovery and prioritization. It's one of those books you'll revisit rather than read once.",
  },
  {
    rating: 5,
    name: "Karan Singh",
    role: "Growth Product Manager",
    quote:
      "The templates and practical examples saved me time at work. Instead of starting from scratch, I could adapt the frameworks directly to my projects.",
  },
  {
    rating: 5,
    name: "Ananya Rao",
    role: "Product Analyst",
    quote:
      "The writing is clear, practical, and free of unnecessary jargon. It feels like learning from someone who's actually built products rather than just teaching theory.",
  },
];

const balancedTestimonials = [
  {
    rating: 3,
    name: "Rohit Malhotra",
    role: "Product Analyst",
    quote:
      "There's a lot of valuable information packed into the handbook, but the sheer length can be intimidating. A quick-start guide or suggested reading path would make it easier for first-time readers.",
  },
  {
    rating: 3,
    name: "Shreya Nair",
    role: "Aspiring Product Manager",
    quote:
      "The content is excellent, but I would've liked more end-of-chapter exercises to help reinforce what I learned. Even so, it's one of the most comprehensive PM references I've come across.",
  },
  {
    rating: 3,
    name: "Aditya Gupta",
    role: "Associate Product Manager",
    quote:
      "Some chapters are quite detailed, which is great when you need depth, but I occasionally wanted a one-page summary before diving in. Overall, it's a solid handbook that I'll keep referring back to.",
  },
];

function Stars({ rating }: { rating: number }) {
  return (
    <p className="text-sm tracking-wide text-accent" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="text-slate-300 dark:text-slate-700">{"★".repeat(5 - rating)}</span>
    </p>
  );
}

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

        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          Sold by Rohan Khullar, Gurugram, India. This handbook is AI-assisted content, curated
          and reviewed by the author. Payments are processed by Razorpay — I never see your card
          or bank details. All sales are final on delivery; see the{" "}
          <Link href="/refund-policy" className="text-accent hover:underline">
            Refund Policy
          </Link>{" "}
          for the one exception (failed/duplicate payments). See also the{" "}
          <Link href="/privacy" className="text-accent hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-accent hover:underline">
            Terms of Service
          </Link>
          .
        </p>

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
          <h2 className="text-lg font-semibold text-navy dark:text-white">What readers are saying</h2>
          <p className="mt-2 text-sm text-slate dark:text-slate-400">
            Feedback from readers on LinkedIn, shared here with their permission.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6"
              >
                <Stars rating={t.rating} />
                <p className="mt-3 text-sm text-slate dark:text-slate-400">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-navy dark:text-white">{t.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{t.role}</p>
              </div>
            ))}
          </div>

          <h3 className="mt-10 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Balanced reviews
          </h3>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {balancedTestimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6"
              >
                <Stars rating={t.rating} />
                <p className="mt-3 text-sm text-slate dark:text-slate-400">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-navy dark:text-white">{t.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{t.role}</p>
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
