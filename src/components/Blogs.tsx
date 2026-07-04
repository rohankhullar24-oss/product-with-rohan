"use client";

import { useScrollAnimation } from "@/lib/use-scroll-animation";
import Link from "next/link";

const blogs = [
  {
    slug: "product-discovery-agent",
    title: "The Product Discovery Agent",
    description: "How AI agents are changing product discovery — from manual signal-hunting to continuous pattern recognition, and what that means for PMs.",
    date: "2026-06-28",
    category: "AI & Product",
  },
  {
    slug: "agile-methodologies-age-of-ai",
    title: "Agile Methodologies in the Age of AI",
    description: "How AI is forcing agile teams to evolve: velocity metrics are breaking, estimation is fiction, and new practices are emerging. Real case studies inside.",
    date: "2026-06-27",
    category: "Agile & AI",
  },
  {
    slug: "state-of-ai-agents-2026",
    title: "AI Agents in Enterprise: The 2026 Reality Check",
    description: "AI agents have moved from demos to daily use — but adoption is far more uneven than the hype suggests. What's working, what's overhyped, and where things are heading.",
    date: "2026-06-24",
    category: "AI & Agents",
  },
  {
    slug: "ai-agents-india-2026",
    title: "The State of AI Agents in India (2026)",
    description: "India is moving fast on AI agents — but on two very different tracks: IT services and GCCs rebuilding around agentic AI, and a sharper debate on jobs, sovereignty, and language.",
    date: "2026-06-17",
    category: "India & AI",
  },
  {
    slug: "ai-agents-transforming-pm-roles",
    title: "How AI Agents Are Transforming PM Roles",
    description: "AI agents are changing what PMs do — from spec-writing and roadmap prioritization to real-time customer insights and cross-functional orchestration. Here's what's staying, what's shifting, and what's new.",
    date: "2026-05-20",
    category: "Product Management",
  },
  {
    slug: "claude-design-pm-roles",
    title: "Claude Is Changing the Design & PM Roles at Anthropic",
    description: "How Claude is reshaping how product managers and designers think about product discovery, spec writing, and user research at Anthropic.",
    date: "2026-04-15",
    category: "Product Management",
  },
  {
    slug: "tokenization-in-ai-2026",
    title: "Tokenization in AI (2026)",
    description: "Exploring how tokenization works in modern LLMs, why it matters for latency and cost, and how different models compare.",
    date: "2026-03-10",
    category: "AI & Technical",
  },
  {
    slug: "ai-job-displacement-report",
    title: "AI Job Displacement Report",
    description: "Data-driven analysis of which job categories are most at risk from AI displacement and what the near-term impact looks like.",
    date: "2026-02-28",
    category: "Jobs & AI",
  },
  {
    slug: "product-sense-frameworks-report",
    title: "Product Sense Interview Frameworks",
    description: "Frameworks and rubrics for evaluating product sense in interviews — what to look for, how to score, and common mistakes.",
    date: "2026-02-10",
    category: "Product Management",
  },
  {
    slug: "pm-industry-state-report",
    title: "State of PM Industry (2026)",
    description: "Survey and analysis of the PM industry in 2026 — hiring trends, compensation, skill gaps, and what's changing.",
    date: "2026-01-20",
    category: "Industry",
  },
];

export default function Blogs() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      id="blogs"
      className="border-b border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-700"
      ref={ref}
    >
      <div
        className={`mx-auto max-w-5xl px-6 py-20 transition-all duration-1000 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">
          Blog
        </h2>
        <h3 className="mt-2 text-3xl font-bold text-navy dark:text-white">
          Latest writing
        </h3>
        <p className="mt-4 max-w-2xl text-slate dark:text-slate-400">
          Thoughts on AI, agents, product management, and the future of work.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {blogs.map((blog, i) => (
            <Link
              key={blog.slug}
              href={`/blogs/${blog.slug}`}
              className={`group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 transition-all duration-300 hover:shadow-xl hover:border-accent dark:hover:border-accent hover:-translate-y-1 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
              style={{
                transitionDelay: isVisible ? `${i * 100}ms` : "0ms",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <span className="inline-block rounded-full bg-accent-light dark:bg-accent/20 px-3 py-1 text-xs font-semibold text-navy dark:text-accent mb-3">
                    {blog.category}
                  </span>
                  <h4 className="text-lg font-bold text-navy dark:text-white group-hover:text-accent transition-colors">
                    {blog.title}
                  </h4>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate dark:text-slate-400">
                {blog.description}
              </p>
              <p className="mt-4 text-xs font-medium text-slate dark:text-slate-500">
                {new Date(blog.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/blogs"
            className="inline-block rounded-full border border-slate-300 dark:border-slate-600 px-6 py-3 text-sm font-semibold text-navy dark:text-white transition-all hover:border-accent hover:text-accent dark:hover:border-accent"
          >
            View all articles →
          </Link>
        </div>
      </div>
    </section>
  );
}
