"use client";

import { useScrollAnimation } from "@/lib/use-scroll-animation";
import { projects } from "@/lib/projects";
import ProjectGrid from "./ProjectGrid";

export default function Projects() {
  const { ref, isVisible } = useScrollAnimation();
  const featuredProjects = projects.filter((p) => p.featured);

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

        <ProjectGrid
          projects={featuredProjects}
          viewAll={{
            href: "/projects/all",
            tagline:
              "More product case studies, side builds, and experiments — filterable by type.",
          }}
        />
      </div>
    </section>
  );
}
