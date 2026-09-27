import Link from "next/link";
import PMNotes from "@/components/PMNotes";
import { projects } from "@/lib/projects";

const DECK_HREF =
  "/projects/commission-payout-automation/Commission_Payout_Automation.pptx";

const HEADLINE_STATS = [
  { value: "₹117L+", label: "monthly payouts now automated" },
  { value: "67%", label: "faster onboarding for a new use case" },
  { value: "₹5-6L", label: "monthly payouts unlocked by auto-reconciliation" },
  { value: "6", label: "products moved off manual processing" },
];

const AUTOMATED_PRODUCTS = [
  "Junior Suraksha",
  "AEPS Mini Statement",
  "Current A/c",
  "DBT",
  "IDC",
  "UPI CWW",
];

const NEXT_PRODUCTS = [
  { name: "Soundbox", amount: "₹8L/mo" },
  { name: "BBPS", amount: "₹50K/mo" },
  { name: "Debit Card for Minor", amount: "New product" },
];

type ThreadStatus = "shipped" | "partly" | "planned";

type Thread = {
  n: string;
  name: string;
  status: ThreadStatus;
  pain: string;
  fix?: React.ReactNode;
  next?: React.ReactNode;
};

const STATUS_STYLES: Record<ThreadStatus, { label: string; className: string }> = {
  shipped: {
    label: "Shipped",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/30",
  },
  partly: {
    label: "Shipped · next phase scoped",
    className:
      "bg-accent-light text-navy ring-accent/30 dark:bg-accent/15 dark:text-accent dark:ring-accent/40",
  },
  planned: {
    label: "Scoped",
    className:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/30",
  },
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-navy dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
      {children}
    </span>
  );
}

function TatComparison() {
  return (
    <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
        Setup time for a new use case
      </p>
      <div>
        <div className="flex items-baseline justify-between text-xs text-slate dark:text-slate-400">
          <span>Before</span>
          <span className="font-semibold text-navy dark:text-white">30+ days</span>
        </div>
        <div className="mt-1 h-2.5 w-full rounded-full bg-slate-300 dark:bg-slate-600" />
      </div>
      <div>
        <div className="flex items-baseline justify-between text-xs text-slate dark:text-slate-400">
          <span>With the KAALIX setup flow</span>
          <span className="font-semibold text-accent">10 days</span>
        </div>
        <div className="mt-1 h-2.5 w-1/3 rounded-full bg-accent" />
      </div>
    </div>
  );
}

const THREADS: Thread[] = [
  {
    n: "01",
    name: "Automation",
    status: "partly",
    pain:
      "Commissions were processed by hand across products. Payouts waited on other teams, every manual calculation was a chance for an error, and setting up a new use case took about 30 days.",
    fix: (
      <>
        <p>
          Automated payouts for six products. ₹117L+ a month now runs without
          anyone touching it, and the new KAALIX setup flow cut onboarding for
          a new use case from 30+ days to 10.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {AUTOMATED_PRODUCTS.map((p) => (
            <Chip key={p}>{p}</Chip>
          ))}
        </div>
        <TatComparison />
      </>
    ),
    next: (
      <>
        <p>
          Extend automation to three more products, adding ₹8.5L+ a month to
          the automated commission stream.
        </p>
        <ul className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {NEXT_PRODUCTS.map((p) => (
            <li
              key={p.name}
              className="flex items-center justify-between bg-white px-4 py-2.5 text-sm dark:bg-slate-900"
            >
              <span className="font-medium text-navy dark:text-white">{p.name}</span>
              <span className="text-slate dark:text-slate-400">{p.amount}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    n: "02",
    name: "Reconciliation",
    status: "shipped",
    pain:
      "Transactions stuck in FULFILMENT_PENDING had to be reconciled by hand, and the payouts behind them sat waiting until someone did.",
    fix: (
      <p>
        Automated the FULFILMENT_PENDING reconciliation, unlocking{" "}
        <strong className="font-semibold text-navy dark:text-white">₹5-6L</strong>{" "}
        in payouts every month.
      </p>
    ),
  },
  {
    n: "03",
    name: "GST & Invoicing",
    status: "planned",
    pain:
      "GST invoices were uploaded manually, and there was little visibility into where a commission stood once it was in the pipeline.",
    next: (
      <>
        <p>
          API-based invoice upload on the Turbo Portal, plus invoice status and
          reference-number visibility on Tez.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-lg font-bold text-navy dark:text-white">14K+</div>
            <div className="text-xs text-slate dark:text-slate-400">users covered</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-lg font-bold text-navy dark:text-white">₹114.5Cr+</div>
            <div className="text-xs text-slate dark:text-slate-400">in payout records</div>
          </div>
        </div>
      </>
    ),
  },
  {
    n: "04",
    name: "Visibility",
    status: "planned",
    pain:
      "Retailers and distributors (RET/DIST) had limited visibility into their commissions and found out what they'd earned only after payout.",
    next: (
      <p>
        Show commission in real time, at the moment of transaction, and surface
        Prime earnings, so users see projected, normal and extra commission{" "}
        <em>before</em> payout instead of after.
      </p>
    ),
  },
];

function Step({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "pain" | "fix" | "next";
  children: React.ReactNode;
}) {
  const dot = {
    pain: "bg-rose-500",
    fix: "bg-accent",
    next: "bg-amber-500",
  }[tone];
  return (
    <div className="relative pl-6">
      <span className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ${dot}`} />
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
        {label}
      </p>
      <div className="mt-1 text-sm leading-relaxed text-slate dark:text-slate-400">
        {children}
      </div>
    </div>
  );
}

function ThreadCard({ thread }: { thread: Thread }) {
  const status = STATUS_STYLES[thread.status];
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/50">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm font-semibold text-accent">{thread.n}</span>
          <h3 className="text-lg font-bold text-navy dark:text-white">{thread.name}</h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${status.className}`}
        >
          {status.label}
        </span>
      </header>
      <div className="mt-5 space-y-5">
        <Step label="Pain point" tone="pain">
          <p>{thread.pain}</p>
        </Step>
        {thread.fix && (
          <Step label="What shipped" tone="fix">
            {thread.fix}
          </Step>
        )}
        {thread.next && (
          <Step label="What's next" tone="next">
            {thread.next}
          </Step>
        )}
      </div>
    </article>
  );
}

export default function CommissionPayout() {
  const pm = projects.find((p) => p.slug === "commission-payout-automation")?.pm;

  return (
    <section className="bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <Link href="/projects/all" className="text-sm text-accent hover:underline">
          ← Back to all projects
        </Link>

        <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-accent">
          Product Case Study · Airtel Payments Bank
        </p>
        <h1 className="mt-2 text-3xl font-bold text-navy dark:text-white sm:text-4xl">
          Commission Payout Automation
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate dark:text-slate-400">
          Commission payouts to retailers and distributors were calculated and
          processed by hand. I led the work to automate them, run as four
          parallel threads, each taken from pain point to fix to what comes next.
        </p>

        <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-700 sm:grid-cols-4">
          {HEADLINE_STATS.map((s) => (
            <div key={s.label} className="bg-white p-5 dark:bg-slate-950">
              <dd className="text-2xl font-bold text-accent">{s.value}</dd>
              <dt className="mt-1 text-xs leading-snug text-slate dark:text-slate-400">
                {s.label}
              </dt>
            </div>
          ))}
        </dl>

        <h2 className="mt-16 text-xl font-bold text-navy dark:text-white">
          Four threads
        </h2>
        <p className="mt-2 text-sm text-slate dark:text-slate-400">
          Sequenced by dependency: automate the highest-payout products first,
          because GST and visibility work is only worth building once the
          payout numbers under it can be trusted.
        </p>
        <div className="mt-6 space-y-6">
          {THREADS.map((t) => (
            <ThreadCard key={t.n} thread={t} />
          ))}
        </div>

        {pm && <PMNotes {...pm} />}

        <div className="mt-10 flex flex-col items-start gap-4 rounded-xl border border-accent/30 bg-accent-light/40 p-6 dark:bg-accent/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-navy dark:text-white">The full deck</p>
            <p className="mt-1 text-sm text-slate dark:text-slate-400">
              Every thread, with the numbers behind it.
            </p>
          </div>
          <a
            href={DECK_HREF}
            download
            className="inline-flex shrink-0 items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Download the deck (.pptx)
          </a>
        </div>
      </div>
    </section>
  );
}
