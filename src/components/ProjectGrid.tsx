"use client";

import { useState, useMemo } from "react";
import type { Project } from "@/lib/projects";

export default function ProjectGrid({ projects }: { projects: Project[] }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const allTags = Array.from(new Set(projects.flatMap((p) => p.tags)));

  const filteredProjects = useMemo(() => {
    if (selectedTags.length === 0) return projects;
    return projects.filter((p) =>
      selectedTags.some((tag) => p.tags.includes(tag))
    );
  }, [selectedTags, projects]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setExpandedIndex(null);
  };

  return (
    <>
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
            onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
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
    </>
  );
}
