import { createClient } from "@/lib/supabase/server";
import type { ShotQuestion } from "@/types/database";
import ShotsClient from "./shots-client";

export const revalidate = 3600;

export default async function ShotsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("shots_questions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const shots = (data ?? []) as ShotQuestion[];

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <div className="mx-auto w-full max-w-3xl px-6 py-10 md:pt-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Daily Shots
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Practice with all product management questions
          </p>
        </div>

        {/* All Shots */}
        {shots.length === 0 ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6">
            <p className="text-slate-600 dark:text-slate-400">
              No questions available yet.
            </p>
          </div>
        ) : (
          <ShotsClient shots={shots} />
        )}
      </div>
    </main>
  );
}
