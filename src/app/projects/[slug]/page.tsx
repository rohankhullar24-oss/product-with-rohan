import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "@/lib/projects";
import PMNotes from "@/components/PMNotes";

// These slugs already have a hand-built page at src/app/projects/<slug>/,
// which Next resolves before this dynamic route — listed here only so this
// route's own generateStaticParams/notFound don't try to also own them.
const BESPOKE_SLUGS = new Set([
  "ai-doc-verification",
  "lead-gen-prd",
  "rekyc-funnel",
  "chladni-plate",
  "decision-dice",
  "stock-analyzer",
]);

function getProject(slug: string) {
  if (BESPOKE_SLUGS.has(slug)) return undefined;
  return projects.find((p) => p.slug === slug);
}

export function generateStaticParams() {
  return projects
    .filter((p) => !BESPOKE_SLUGS.has(p.slug))
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};

  const url = `https://productwithrohan.online/projects/${slug}`;
  return {
    title: `${project.title} | Product with Rohan`,
    description: project.description,
    keywords: project.tags,
    openGraph: {
      type: "website",
      url,
      title: project.title,
      description: project.description,
    },
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  return (
    <main className="flex-1 bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <Link href="/projects/all" className="text-sm text-accent hover:underline">
          ← Back to all projects
        </Link>

        <div className="mt-6 flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent-light dark:bg-accent/20 px-3 py-1 text-xs font-semibold text-navy dark:text-accent"
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="mt-4 text-3xl font-bold text-navy dark:text-white sm:text-4xl">
          {project.title}
        </h1>
        <p className="mt-4 text-slate dark:text-slate-400">
          {project.fullDescription ?? project.description}
        </p>

        <PMNotes {...project.pm} />

        {project.href && (
          <a
            href={project.href}
            target={project.external ? "_blank" : undefined}
            rel={project.external ? "noopener noreferrer" : undefined}
            className="mt-8 inline-flex items-center text-sm font-semibold text-accent hover:underline"
          >
            {project.linkLabel ?? "View →"}
          </a>
        )}
      </div>
    </main>
  );
}
