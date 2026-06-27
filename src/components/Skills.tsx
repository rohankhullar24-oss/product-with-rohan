"use client";

import { useState, useMemo } from "react";
import { useScrollAnimation } from "@/lib/use-scroll-animation";

const skillGroups = [
  {
    title: "Product Management",
    skills: [
      "Product strategy",
      "Roadmapping",
      "Opportunity sizing & prioritization",
      "Product discovery",
      "GTM strategy",
      "Product analytics",
      "A/B testing",
      "Agile / Scrum",
    ],
  },
  {
    title: "Growth & User Experience",
    skills: [
      "Funnel optimization",
      "User acquisition",
      "Activation",
      "Conversion optimization",
      "Retention strategy",
      "Experimentation",
      "User research",
    ],
  },
  {
    title: "Platform Products",
    skills: [
      "Workflow automation",
      "Self-service platforms",
      "API integrations",
      "Platform modernization",
      "Business process automation",
      "Internal tools",
    ],
  },
  {
    title: "AI & Automation",
    skills: [
      "AI agents (LangGraph, LangChain)",
      "LLM workflows",
      "AI-powered automation",
      "Agentic AI",
      "Prompt engineering",
      "Rapid prototyping",
      "AI-assisted product development",
    ],
  },
  {
    title: "Leadership",
    skills: [
      "Stakeholder management",
      "Cross-functional collaboration",
      "Requirement gathering",
      "Product execution",
    ],
  },
  {
    title: "Tools & Platforms",
    skills: ["SQL", "Power BI", "Google Analytics", "Jira", "Figma", "Claude", "ChatGPT", "Cursor", "VS Code"],
  },
];

export default function Skills() {
  const { ref, isVisible } = useScrollAnimation();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSkillGroups = useMemo(() => {
    if (!searchQuery.trim()) return skillGroups;

    const query = searchQuery.toLowerCase();
    return skillGroups
      .map((group) => ({
        ...group,
        skills: group.skills.filter((skill) =>
          skill.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.skills.length > 0);
  }, [searchQuery]);

  const allFilteredSkills = filteredSkillGroups.reduce(
    (acc, group) => acc + group.skills.length,
    0
  );

  return (
    <section
      id="skills"
      className="border-b border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
      ref={ref}
    >
      <div
        className={`mx-auto max-w-5xl px-6 py-20 transition-all duration-1000 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">
          Skills
        </h2>
        <h3 className="mt-2 text-3xl font-bold text-navy dark:text-white">
          What I bring to the table
        </h3>

        <div className="mt-8 relative">
          <input
            type="text"
            placeholder="Search skills (e.g., 'fintech', 'analytics', 'leadership')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-slate dark:text-white bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate dark:text-slate-400 hover:text-navy dark:hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {searchQuery && (
          <p className="mt-4 text-sm text-slate dark:text-slate-400">
            Found {allFilteredSkills} skill{allFilteredSkills !== 1 ? "s" : ""} matching "{searchQuery}"
          </p>
        )}

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSkillGroups.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold uppercase tracking-widest text-navy dark:text-white">
                {group.title}
              </h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.skills.map((skill) => (
                  <span
                    key={skill}
                    className="group/skill rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm text-slate dark:text-slate-300 hover:border-accent dark:hover:border-accent hover:bg-accent-light dark:hover:bg-accent/10 transition-all duration-200 cursor-pointer transform hover:scale-110 hover:shadow-md"
                    onClick={() => setSearchQuery(skill)}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {searchQuery && filteredSkillGroups.length === 0 && (
          <div className="mt-10 text-center text-slate dark:text-slate-400">
            <p>No skills match "{searchQuery}".</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-2 text-accent hover:underline font-semibold"
            >
              Clear search
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
