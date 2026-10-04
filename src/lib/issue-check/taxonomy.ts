import { createAdminClient } from "@/lib/supabase/admin";

/** [issue_id, name, action, structural, applicability] */
export type IssueRow = [number, string, string, boolean, string];
export type Part = { idx: number; path: string; issues: IssueRow[] };

/**
 * The part/issue list is company data, so it lives in the private
 * `issue_check_parts` table (RLS on, no policies) rather than in this public
 * repo. It changes rarely, so one read per server instance per hour is plenty.
 */
const TTL_MS = 60 * 60 * 1000;
let cache: { at: number; parts: Part[]; text: string } | null = null;

export async function loadTaxonomy(): Promise<{ parts: Part[]; text: string }> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;

  const { data, error } = await createAdminClient()
    .from("issue_check_parts")
    .select("idx, path, issues")
    .order("idx");
  if (error) throw new Error(`Could not load the parts list: ${error.message}`);
  if (!data?.length) throw new Error("The parts list is empty.");

  const parts = data as Part[];
  const text = parts
    .map((p) => `P${p.idx} ${p.path} :: ${p.issues.map((i) => `${i[0]}=${i[1]}`).join("; ")}`)
    .join("\n");

  cache = { at: Date.now(), parts, text };
  return cache;
}
