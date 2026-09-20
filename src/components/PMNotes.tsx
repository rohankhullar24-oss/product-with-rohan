import type { PMNotesData } from "@/lib/projects";

export default function PMNotes({ users, approach, metric, status }: PMNotesData) {
  const items = [
    ...(users ? [{ label: "Who it's for", value: users }] : []),
    { label: "Approach", value: approach },
    { label: "Metric I'd chase", value: metric },
    ...(status ? [{ label: "Status", value: status }] : []),
  ];

  return (
    <div className="mt-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-accent">
        From a PM&apos;s Desk
      </h2>
      <dl className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-sm font-semibold text-navy dark:text-white">
              {item.label}
            </dt>
            <dd className="mt-1 text-sm text-slate dark:text-slate-400">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
