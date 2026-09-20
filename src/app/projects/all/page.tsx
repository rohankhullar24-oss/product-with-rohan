import { Metadata } from "next";
import Link from "next/link";
import { projects } from "@/lib/projects";
import ProjectGrid from "@/components/ProjectGrid";

export const metadata: Metadata = {
  title: "All Projects | Rohan Khullar",
  description:
    "Every product case study and side project Rohan Khullar has built or led, filterable by type — fintech growth work, AI-built apps, and side tools.",
  keywords: ["product manager portfolio", "case studies", "side projects", "fintech", "AI"],
  openGraph: {
    type: "website",
    url: "https://productwithrohan.online/projects/all",
    title: "All Projects | Rohan Khullar",
    description:
      "Every product case study and side project Rohan Khullar has built or led.",
  },
};

export default function AllProjectsPage() {
  return (
    <main className="flex-1 bg-white dark:bg-slate-950 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <Link href="/#projects" className="text-sm text-accent hover:underline">
          ← Back to home
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-navy dark:text-white sm:text-4xl">
          All Projects
        </h1>
        <p className="mt-3 max-w-2xl text-slate dark:text-slate-400">
          Every product case study and side project I&apos;ve built or led — {projects.length} in total.
        </p>

        <ProjectGrid projects={projects} />
      </div>
    </main>
  );
}
