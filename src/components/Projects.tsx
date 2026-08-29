"use client";

import { useState, useMemo } from "react";
import { useScrollAnimation } from "@/lib/use-scroll-animation";

type Project = {
  title: string;
  description: string;
  fullDescription?: string;
  tags: string[];
  href?: string;
  external?: boolean;
  linkLabel?: string;
};

const projects: Project[] = [
  {
    title: "Product Shots: Finshots for Product Managers",
    description:
      "Daily product management practice inspired by Finshots. Get bite-sized PM questions daily, curated news (AI, corporate, hiring), and weekly articles, all designed to sharpen your product thinking.",
    fullDescription:
      "Product Shots brings the Finshots approach to product management learning. The app combines three core features: (1) Daily rotating product-sense questions across 8 types (guesstimate, behavioral, prioritization, metrics, root cause, strategy, critique, analysis) with full written answers; (2) Curated PM-relevant news auto-pulled daily (AI, corporate, hiring); (3) Weekly articles from Rohan's blog on applied product thinking. Built with Next.js + Supabase, email-only authentication, and persistent sessions. Users can browse past questions via the archive and explore news by category. Features a Finshots-inspired UI with dark mode, sidebar navigation, and category filters. Deployed to Vercel with automated daily content generation.",
    tags: ["Side Project", "PM Tool", "Learning"],
    href: "/productshot/dashboard",
    external: false,
    linkLabel: "Open the live app →",
  },
  {
    title: "AI-Powered Document Verification for Merchant Onboarding",
    description:
      "Led the design and rollout of an AI-driven document-verification workflow for partner KYC, cutting manual verification effort by 60% while strengthening fraud and RBI compliance controls.",
    fullDescription:
      "I designed and implemented an AI-powered document verification system to automate merchant KYC (Know Your Customer) processes. Using machine learning for document classification and extraction, I reduced manual verification effort by 60%, improved compliance with RBI regulations, and built a more robust fraud detection system. This became a foundational component of the broader merchant onboarding revamp.",
    tags: ["Product Case Study", "AI/ML"],
  },
  {
    title: "Reminders: The Android App That Won't Let You Forget",
    description:
      "A native Android app for birthdays, anniversaries and tasks that rings like an alarm clock, as many times a day as you want, and keeps coming back until you confirm you've actually done it.",
    fullDescription:
      "Most reminder apps fire one notification you swipe away and forget. Reminders is built around a single idea: it doesn't stop until you tap Done. Set a birthday, anniversary, bill, or habit, choose how many times a day it should reach you (four or five times on the day itself is the point), and it rings your alarm tone on loop with a full-screen Done/Snooze screen over the lock screen. Ignore it and it comes back every 30 minutes, at your choice of interval, indefinitely. Supports one-time, daily, weekly, monthly and yearly reminders, with exact alarms that survive reboots, time changes and timezone changes. Optional email sign-in syncs your reminders across devices so they're waiting on any phone you log into, plus automatic Google backup and manual export/import so nothing is lost if you reinstall. Built in Kotlin with AlarmManager exact alarms and a Supabase backend; APK built and published automatically on every commit.",
    tags: ["Side Project", "Android App", "AI-Built"],
    href: "https://github.com/rohankhullar24-oss/product-with-rohan/releases/download/reminder-app-latest/Reminders.apk",
    external: true,
    linkLabel: "Download the app →",
  },
  {
    title: "Lead-Generation & Assignment Tool",
    description:
      "Built a lead-generation and assignment tool that routes 25K leads/month into the onboarding funnel, and used activation-trend analysis to expand the retailer services catalog.",
    fullDescription:
      "Designed and launched a lead-generation and intelligent assignment tool that processes 25,000 leads monthly into the merchant onboarding pipeline. Used activation-trend analysis to identify untapped service opportunities (micro-ATM, biometric authentication) and expanded the retailer services catalog through third-party provider integrations. This tool became a key driver of merchant acquisition growth.",
    tags: ["Product Case Study"],
  },
  {
    title: "Prototype Merchant App",
    description:
      "A working merchant-facing app prototype built entirely with Claude, no code written manually. Demonstrates how product thinking translates directly into a functional UI.",
    fullDescription:
      "Built a fully functional merchant-facing mobile app prototype using Claude without writing any code manually. The prototype demonstrates core merchant workflows including transaction history, settlement tracking, and merchant profile management. It showcases how clear product thinking and detailed specifications can be directly translated into a working UI/UX experience.",
    tags: ["Side Project", "AI-Built"],
    href: "https://claude.ai/public/artifacts/3cbc7699-4172-43fd-9aad-a97f1f3634da",
    external: true,
  },
  {
    title: "RE-KYC Funnel Improvement",
    description:
      "Improved a broken re-KYC flow that was failing on nearly every screen, lifting conversion from 5% to 50% and cutting shop-photo rejections from 50% to 2%.",
    fullDescription:
      "The re-KYC flow was new and riddled with bugs: blank pages, generic errors, and a shop-photo review step rejecting half of all submissions. Most cases only completed after manual intervention from sales and support. I diagnosed the failure points across the journey, resolved the underlying issues, and re-stitched the flow so users could complete it unassisted. Conversion rose from 5% to 50%, and shop-photo rejections dropped from 50% to 2% through SOP changes and better visibility for the review team.",
    tags: ["Product Case Study"],
  },
  {
    title: "This Portfolio Site: Built with AI, No Code Written",
    description:
      "Designed and shipped this entire site (Next.js + Tailwind) by directing Claude end-to-end, from spec and content to layout, styling, and deployment, without writing a single line of code myself.",
    fullDescription:
      "This entire portfolio site was built without writing any code myself. I used Claude to design the spec, create the layout, implement styling with Tailwind, and deploy to Vercel. This demonstrates how product managers can leverage AI to ship functional products independently, from concept to production: a hands-on look at how PMs can use AI to ship product themselves.",
    tags: ["Side Project", "AI-Built"],
  },
  {
    title: "Retailer & Business KPI Visibility for Distributors",
    description:
      "A business-led initiative giving distributors visibility into business KPIs and retailer status, targeting retention of ~₹80 Cr out of ~₹200 Cr in at-risk retailer business.",
    fullDescription:
      "Started as a business-led initiative to give distributors visibility into the KPIs of the retailers and sub-distributors under them, since they had no way to track or push performance. I built downloadable KPI and status visibility, including flagging which retailers had gone inactive. Roughly 55-58K retailers (₹200 Cr in business) had gone dormant with no way for distributors to see it. Modeled to retain ~40% of at-risk retailers (~₹80 Cr in business) by closing the visibility gap.",
    tags: ["Product Case Study"],
  },
  {
    title: "Indian Stock Analyzer",
    description:
      "A fundamental analysis tool for Indian stocks with comprehensive metrics (P/E, ROE, debt ratios, profit margins) and AI-powered scoring to help identify investment opportunities. Analyzes 8+ major Indian stocks with detailed financial insights.",
    fullDescription:
      "Built an interactive stock analysis platform for Indian equities that uses fundamental metrics to score and rank stocks. The tool evaluates companies across 7 key financial dimensions (P/E ratio, ROE, debt-to-equity, revenue growth, profit margin, liquidity, and ROA), generating a composite investment score (0-100). Features include detailed metric breakdowns, trend analysis, investment ratings (Strong Buy to Avoid), and sector comparisons. Covers blue-chip stocks like Reliance, TCS, Infosys, and HDFC. Designed as an educational tool to help retail investors understand fundamental analysis without requiring financial expertise.",
    tags: ["Side Project", "Finance Tool"],
    href: "/projects/stock-analyzer",
  },
  {
    title: "Aadhaar Onboarding Flow Enhancement",
    description:
      "Reworked the onboarding flow end-to-end: face-auth, shop-photo fixes, UI cleanup, pre-filled business details, and API-based document verification to cut TAT. Raised conversion from 50% to 73%.",
    fullDescription:
      "The Aadhaar-based onboarding flow had several failure points: state mismatches, unclear category options, and success screens shown even after failures, all of which were dropping users before completion. I drove a set of fixes across the flow: face-authentication to replace a weak verification step, shop-photo capture fixes, general UI cleanup, pre-filling of business details to cut manual entry, and API-based verification of business documents to reduce turnaround time. Together these took conversion from 50% to 73%.",
    tags: ["Product Case Study"],
  },
  {
    title: "Decision Dice",
    description:
      "A lightweight tool for beating analysis paralysis: enter the options you're torn between, answer a couple of quick questions about your priorities, and get a ranked recommendation with a one-line rationale.",
    fullDescription:
      "Decision Dice solves the problem of analysis paralysis by systematically evaluating your options against your stated priorities. The tool uses a simple questionnaire approach to understand what matters most to you, then applies weighted scoring to provide a clear recommendation. It's available at /projects/decision-dice with a fully interactive interface.",
    tags: ["Side Project", "Tool"],
    href: "/projects/decision-dice",
  },
  {
    title: "IMS: End-to-End Device Ordering Platform",
    description:
      "Built and launched IMS, an end-to-end ordering platform now underpinning ~₹7 Cr in monthly GMV, letting retailers order devices (micro-ATMs, thermal printers, biometric devices, passbook printers, soundboxes, note-counting machines) directly through a self-serve flow.",
    fullDescription:
      "Led the launch of IMS (Inventory/Item Management System), a platform that took device ordering for retailers from a manual, offline process to a self-serve digital flow. Started with micro-ATM ordering, then expanded coverage to thermal printers, biometric devices, passbook printers, soundboxes, and note-counting machines. Also built employer registration into the flow and drove the security sign-off and compliance addendum work needed to get it fully live. The platform now underpins ~₹7 Cr in monthly GMV and is the backbone for how retailers procure the hardware they need to operate.",
    tags: ["Product Case Study"],
  },
  {
    title: "The Chladni Plate: A Physics Toy You Have to Tune",
    description:
      "An interactive simulation of the 1787 experiment where sand on a vibrating steel plate arranges itself into geometric figures. Hunt the dial for 21 hidden resonances, and hear each one as its own musical interval.",
    fullDescription:
      "In 1787 Ernst Chladni sprinkled sand on a metal plate and bowed the edge. At most frequencies nothing happens. At a resonance, the grains flee the parts that are shaking and pile up along the lines that stay perfectly still: a different geometric figure at every resonant frequency. This is that experiment, simulated honestly: 22,000 grains each take a random hop every frame, hop harder where the plate moves more, and only keep the hop if they land somewhere calmer. Nothing draws the pattern. The pattern is what's left over once the grains stop moving. Twenty-one resonances are hidden between 100 and 2200 Hz, and the plate only responds near one, so finding them is the game. Each figure you land on gets logged in a register with a tick mark on the dial so you can return to it. It is also audible: pitch follows the dial and loudness follows the plate's real response, so the tone goes quiet between resonances and blooms about nine times louder as a figure forms. Each figure carries its own interval, derived from the same two whole numbers that determine its shape: 2,1 is an octave, 3,2 a fifth, 4,3 a fourth, and the crowded high modes come out dissonant. Built as a canvas simulation with a cosine lookup table, Metropolis-style acceptance, and a Web Audio voice, holding 60fps in a browser tab.",
    tags: ["Side Project", "AI-Built"],
    href: "/projects/chladni-plate",
    linkLabel: "Open the plate →",
  },
  {
    title: "CarBecho: Used-Car Inspection Co-Pilot",
    description:
      "A field-inspector tool for used-car checklists. Voice, text, and photo answers get logged straight to a 200-point inspection via an AI co-pilot, no code written manually.",
    fullDescription:
      "CarBecho is an interactive inspection flow for used-car field inspectors: job list → verify & pair → a 200-point checklist (8 sections, 40 rows, Yes/No only) → report. An AI chat co-pilot (Gemini) is available from every row, accepting text, voice, or photo answers and fuzzy-matching replies straight onto the checklist row with a one-tap Mark button. A companion voice-only mode lets an inspector just ask a question and get a spoken answer. Findings feed a shared log with search and severity/section/photo filters. Built with Next.js and Supabase, directed end-to-end via Claude.",
    tags: ["Side Project", "AI-Built"],
    href: "/carbecho",
  },
  {
    title: "Free AI Course Platform",
    description:
      "A work-in-progress interactive course platform teaching Applied AI concepts. Features 6 weeks of curriculum, video lessons, downloadable starter code, and progress tracking. Currently a prototype being built in public.",
    fullDescription:
      "Building an interactive course platform to teach Applied AI concepts from first principles. The platform features a 6-week curriculum covering LLMs, autonomous agents, ML models, RAG systems, production deployment, and AI capstone projects. Each week includes structured lessons, hands-on project briefs, downloadable Python starter code, and progress tracking. Currently live as a prototype, videos and expanded content coming soon. Designed to be a practical, hands-on introduction to AI engineering.",
    tags: ["Side Project", "WIP", "AI Education"],
    href: "/course",
  },
];

export default function Projects() {
  const { ref, isVisible } = useScrollAnimation();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const allTags = Array.from(new Set(projects.flatMap((p) => p.tags)));

  const filteredProjects = useMemo(() => {
    if (selectedTags.length === 0) return projects;
    return projects.filter((p) =>
      selectedTags.some((tag) => p.tags.includes(tag))
    );
  }, [selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setExpandedIndex(null);
  };

  return (
    <section
      id="projects"
      className="border-b border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-700"
      ref={ref}
    >
      <div
        className={`mx-auto max-w-5xl px-6 py-20 transition-all duration-1000 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">
          Projects
        </h2>
        <h3 className="mt-2 text-3xl font-bold text-navy dark:text-white">
          Things I&apos;ve built
        </h3>
        <p className="mt-4 max-w-2xl text-slate dark:text-slate-400">
          A mix of product case studies from my work and personal side projects.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                selectedTags.includes(tag)
                  ? "bg-accent text-white dark:text-navy"
                  : "border border-slate-300 text-slate dark:border-slate-600 dark:text-slate-400 hover:border-accent hover:text-accent dark:hover:border-accent"
              }`}
            >
              {tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="ml-2 rounded-full px-4 py-2 text-sm font-medium text-slate dark:text-slate-400 underline hover:text-navy dark:hover:text-white"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project, i) => (
            <div
              key={i}
              className={`group flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 transition-all duration-300 hover:shadow-xl hover:border-accent dark:hover:border-accent hover:-translate-y-2 cursor-pointer transform ${
                expandedIndex === i ? "ring-2 ring-accent" : ""
              }`}
              onClick={() =>
                setExpandedIndex(expandedIndex === i ? null : i)
              }
            >
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-accent-light dark:bg-accent/20 px-3 py-1 text-xs font-semibold text-navy dark:text-accent"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h4 className="mt-4 text-lg font-bold text-navy dark:text-white">
                {project.title}
              </h4>
              <p className="mt-2 text-sm text-slate dark:text-slate-400">
                {expandedIndex === i && project.fullDescription
                  ? project.fullDescription
                  : project.description}
              </p>

              {project.fullDescription && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedIndex(expandedIndex === i ? null : i);
                  }}
                  className="mt-3 text-sm font-semibold text-accent hover:underline dark:text-accent"
                >
                  {expandedIndex === i ? "Show less" : "Show more"}
                </button>
              )}

              {project.href && (
                <a
                  href={project.href}
                  target={project.external ? "_blank" : undefined}
                  rel={project.external ? "noopener noreferrer" : undefined}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-4 inline-flex items-center text-sm font-semibold text-accent hover:underline"
                >
                  {project.linkLabel ?? "View prototype →"}
                </a>
              )}
            </div>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="mt-10 text-center text-slate dark:text-slate-400">
            <p>No projects match the selected filters.</p>
          </div>
        )}
      </div>
    </section>
  );
}
