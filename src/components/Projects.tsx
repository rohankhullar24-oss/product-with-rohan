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
};

const projects: Project[] = [
  {
    title: "Prototype Merchant App",
    description:
      "A working merchant-facing app prototype built entirely with Claude — no code written manually. Demonstrates how product thinking translates directly into a functional UI.",
    fullDescription:
      "Built a fully functional merchant-facing mobile app prototype using Claude without writing any code manually. The prototype demonstrates core merchant workflows including transaction history, settlement tracking, and merchant profile management. It showcases how clear product thinking and detailed specifications can be directly translated into a working UI/UX experience.",
    tags: ["Side Project", "AI-Built"],
    href: "https://claude.ai/public/artifacts/3cbc7699-4172-43fd-9aad-a97f1f3634da",
    external: true,
  },
  {
    title: "Free AI Course Platform",
    description:
      "A work-in-progress interactive course platform teaching Applied AI concepts. Features 6 weeks of curriculum, video lessons, downloadable starter code, and progress tracking. Currently a prototype being built in public.",
    fullDescription:
      "Building an interactive course platform to teach Applied AI concepts from first principles. The platform features a 6-week curriculum covering LLMs, autonomous agents, ML models, RAG systems, production deployment, and AI capstone projects. Each week includes structured lessons, hands-on project briefs, downloadable Python starter code, and progress tracking. Currently live as a prototype — videos and expanded content coming soon. Designed to be a practical, hands-on introduction to AI engineering.",
    tags: ["Side Project", "WIP", "AI Education"],
    href: "/course",
  },
  {
    title: "AI-Powered Document Verification for Merchant Onboarding",
    description:
      "Led the design and rollout of an AI-driven document-verification workflow for partner KYC, cutting manual verification effort by 60% while strengthening fraud and RBI compliance controls.",
    fullDescription:
      "This project involved designing and implementing an AI-powered document verification system to automate merchant KYC (Know Your Customer) processes. By leveraging machine learning for document classification and extraction, we reduced manual verification effort by 60%, improved compliance with RBI regulations, and created a more robust fraud detection system. This became a foundational component of the broader merchant onboarding revamp.",
    tags: ["Product Case Study", "AI/ML"],
  },
  {
    title: "This Portfolio Site — Built with AI, No Code Written",
    description:
      "Designed and shipped this entire site (Next.js + Tailwind) by directing Claude end-to-end — from spec and content to layout, styling, and deployment — without writing a single line of code myself.",
    fullDescription:
      "This entire portfolio site was built without writing any code myself. I used Claude to design the spec, create the layout, implement styling with Tailwind, and deploy to Vercel. This demonstrates how product managers can leverage AI to ship functional products independently, from concept to production—a hands-on look at how PMs can use AI to ship product themselves.",
    tags: ["Side Project", "AI-Built"],
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
    title: "Lead-Generation & Assignment Tool",
    description:
      "Built a lead-generation and assignment tool that routes 25K leads/month into the onboarding funnel, and used activation-trend analysis to expand the retailer services catalog.",
    fullDescription:
      "Designed and launched a lead-generation and intelligent assignment tool that processes 25,000 leads monthly into the merchant onboarding pipeline. Used activation-trend analysis to identify untapped service opportunities (micro-ATM, biometric authentication) and expanded the retailer services catalog through third-party provider integrations. This tool became a key driver of merchant acquisition growth.",
    tags: ["Product Case Study"],
  },
  {
    title: "Indian Stock Analyzer",
    description:
      "A fundamental analysis tool for Indian stocks with comprehensive metrics (P/E, ROE, debt ratios, profit margins) and AI-powered scoring to help identify investment opportunities. Analyzes 8+ major Indian stocks with detailed financial insights.",
    fullDescription:
      "Built an interactive stock analysis platform for Indian equities that uses fundamental metrics to score and rank stocks. The tool evaluates companies across 7 key financial dimensions — P/E ratio, ROE, debt-to-equity, revenue growth, profit margin, liquidity, and ROA — generating a composite investment score (0-100). Features include detailed metric breakdowns, trend analysis, investment ratings (Strong Buy to Avoid), and sector comparisons. Covers blue-chip stocks like Reliance, TCS, Infosys, and HDFC. Designed as an educational tool to help retail investors understand fundamental analysis without requiring financial expertise.",
    tags: ["Side Project", "Finance Tool"],
    href: "/projects/stock-analyzer",
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
                  View prototype →
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
