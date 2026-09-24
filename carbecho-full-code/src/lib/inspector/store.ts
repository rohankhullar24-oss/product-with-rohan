import { createAdminClient } from "@/lib/supabase/admin";

export type StoredFinding = {
  id: string;
  created_at: string;
  question: string;
  say: string;
  section: string;
  item: string;
  severity: string;
  action: string;
  lang: string;
  thumb: string | null;
  has_photo: boolean;
};

export type NewFinding = Omit<StoredFinding, "id" | "created_at">;

/**
 * Writes go through the service role so the public anon key stays read-only -
 * the findings table has a select policy and no insert policy on purpose.
 * Returns false rather than throwing: failing to log a finding must never cost
 * the inspector their answer.
 */
export async function saveFinding(finding: NewFinding): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[inspector] SUPABASE_SERVICE_ROLE_KEY missing - finding not saved");
    return false;
  }

  try {
    const { error } = await createAdminClient().from("inspection_findings").insert(finding);
    if (error) {
      console.error("[inspector] save failed", error.message);
      return false;
    }
    return true;
  } catch (caught) {
    console.error("[inspector] save threw", caught);
    return false;
  }
}
