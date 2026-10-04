import { createAnthropicClient } from "@/lib/anthropic";
import type { Part } from "./taxonomy";

export type Frame = { mime: string; data: string; t?: number };
export type MediaKind = "image" | "frames";

export type Finding = {
  partIndex: number;
  part: string;
  issueId: number;
  issue: string;
  action: string;
  severity: "" | "Micro" | "Minor" | "Major";
  structural: boolean;
  inList: boolean;
  confidence: number;
  reason: string;
  box: [number, number, number, number] | null;
  frame: number;
  time: string;
  options: [number, string][];
};

export type CheckResult = {
  view: string;
  photoOk: boolean;
  retakeReason: string;
  alsoCheck: string;
  findings: Finding[];
};

export function instructions(taxonomyText: string): string {
  return [
    "You are the Inspect Agent for a used-car company in India. A field inspector at the car sends a photo or a few frames from a short video. The inspector does NOT say which part it is.",
    "Your job:",
    "1. Identify which car part(s) are clearly shown, including side (Left/Right = the car's own left/right as seen from the driver seat; Front/Rear). Pick them ONLY from the PART LIST below, by their P-number.",
    "2. For each part, choose the issue from THAT part's list only, by its issue number. If the part looks fine, use issue 0 (No issue). Prefer the -Micro / -Minor / -Major variant that matches what you see: Micro = barely visible; Minor = clearly visible, small repair; Major = large, deep, broken, or needs replacement.",
    "3. Say whether the photo is good enough to decide (blur, darkness, glare, part cut off or too far away = retake).",
    "Rules: report at most 3 findings, most important first. Never invent parts or issues outside the list. If you cannot tell which part it is, return an empty findings list and explain in \"view\". Write for a low-literacy inspector: plain short English, max 18 words per sentence. Never mention prices or costs.",
    "Reply with ONLY this JSON:",
    '{"view":"one plain sentence on what the photo or video shows","photo_ok":true,"retake_reason":"","findings":[{"part":12,"issue":1733,"confidence":80,"reason":"one plain sentence on the evidence","frame":0,"box":[ymin,xmin,ymax,xmax]}],"also_check":"one short tip on what to look at or test next, or empty"}',
    "frame: for a photo use 0; for numbered video frames use the frame number where the issue is clearest. box: around the evidence on that photo/frame, integers 0-1000 relative to the image, or null. confidence: 0-100.",
    "A video may walk around several parts: report the most important findings across all frames (still max 3), each with its own frame number.",
    "",
    "PART LIST (P-number, path, then issue-number=issue-name):",
    taxonomyText,
  ].join("\n");
}

export function mmss(t: number | undefined): string {
  const s = Math.max(0, Math.round(Number(t) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function closing(kind: MediaKind, n: number): string {
  return kind === "frames"
    ? `Above are ${n} frames from the inspector's video, in time order. Analyse them now.`
    : "Above is the inspector's photo. Analyse it now.";
}

/** Tried in order; Gemini quota is per model, same reasoning as /api/inspector. */
const GEMINI_MODELS: { name: string; disableThinking: boolean }[] = [
  { name: "gemini-2.5-flash", disableThinking: true },
  { name: "gemini-3.5-flash-lite", disableThinking: false },
];

export class ProviderError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function callGemini(system: string, media: Frame[], kind: MediaKind) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new ProviderError("GEMINI_API_KEY is not configured.", 500);

  const parts: Record<string, unknown>[] = [];
  media.forEach((m, i) => {
    if (kind === "frames") parts.push({ text: `Frame ${i} (at ${mmss(m.t)})` });
    parts.push({ inlineData: { mimeType: m.mime, data: m.data } });
  });
  parts.push({ text: closing(kind, media.length) });

  let lastStatus = 0;
  let lastDetail = "";
  for (const model of GEMINI_MODELS) {
    const generationConfig: Record<string, unknown> = {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    };
    if (model.disableThinking) generationConfig.thinkingConfig = { thinkingBudget: 0 };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts }],
          generationConfig,
        }),
      }
    );

    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text.trim()) {
        throw new ProviderError(
          `Gemini returned no answer (${data.candidates?.[0]?.finishReason ?? "blocked"}).`,
          502
        );
      }
      return { raw: text, model: model.name };
    }

    lastStatus = res.status;
    lastDetail = await res.text();
    console.error("[issue-check] %s failed", model.name, res.status, lastDetail.slice(0, 300));
    // Only quota and overload are worth retrying on another model.
    if (res.status !== 429 && res.status !== 503) break;
  }

  if (lastStatus === 429) {
    throw new ProviderError("The AI's free quota is used up for now. Try again later.", 429);
  }
  if (lastStatus === 503) throw new ProviderError("The AI is overloaded. Try again in a moment.", 503);
  throw new ProviderError(`Gemini error ${lastStatus}.`, 502);
}

export async function callClaude(system: string, media: Frame[], kind: MediaKind) {
  if (!process.env.ANTHROPIC_API_KEY) throw new ProviderError("ANTHROPIC_API_KEY is not configured.", 500);
  const model = process.env.ISSUE_CHECK_CLAUDE_MODEL || "claude-sonnet-5-5";

  type Block =
    | { type: "text"; text: string }
    | {
        type: "image";
        source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/webp"; data: string };
      };
  const content: Block[] = [];
  media.forEach((m, i) => {
    if (kind === "frames") content.push({ type: "text", text: `Frame ${i} (at ${mmss(m.t)})` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: m.mime as "image/jpeg", data: m.data },
    });
  });
  content.push({ type: "text", text: closing(kind, media.length) });

  const msg = await createAnthropicClient().messages.create({
    model,
    max_tokens: 1500,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
  });
  const raw = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return { raw, model };
}

export function parseJson(t: string): Record<string, unknown> | null {
  const s = String(t || "").trim();
  const tryParse = (x: string) => {
    try {
      const v = JSON.parse(x);
      return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  const direct = tryParse(s);
  if (direct) return direct;
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(s);
  if (fence) {
    const v = tryParse(fence[1]);
    if (v) return v;
  }
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  return a >= 0 && b > a ? tryParse(s.slice(a, b + 1)) : null;
}

/** Maps the model's P-numbers and issue numbers back onto the real list, dropping anything invented. */
export function resolve(r: Record<string, unknown>, parts: Part[], frameCount: number): CheckResult {
  const raw = Array.isArray(r.findings) ? (r.findings as Record<string, unknown>[]) : [];
  const findings = raw
    .filter((f) => parts[Number(f.part)])
    .slice(0, 3)
    .map((f): Finding => {
      const partIndex = Number(f.part);
      const part = parts[partIndex];
      const issueId = Number(f.issue) || 0;
      const box =
        Array.isArray(f.box) && f.box.length === 4 && f.box.every((n) => Number.isFinite(Number(n)))
          ? (f.box.map((n) => Math.max(0, Math.min(1000, Number(n)))) as [number, number, number, number])
          : null;
      const res: Finding = {
        partIndex,
        part: part.path,
        issueId,
        issue: "No issue",
        action: "",
        severity: "",
        structural: false,
        inList: true,
        confidence: Math.max(0, Math.min(100, Math.round(Number(f.confidence) || 0))),
        reason: String(f.reason ?? ""),
        box,
        frame: Math.max(0, Math.min(frameCount - 1, Math.round(Number(f.frame) || 0))),
        time: "",
        options: part.issues.map((i) => [i[0], i[1]]),
      };
      if (issueId) {
        const hit = part.issues.find((i) => i[0] === issueId);
        if (hit) {
          res.issue = hit[1];
          res.action = hit[2];
          res.structural = hit[3];
          const m = /(Micro|Minor|Major)\b/i.exec(hit[1]);
          res.severity = m
            ? ((m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()) as Finding["severity"])
            : "";
        } else {
          res.inList = false;
          res.issue = `Issue ${issueId} (not in this part's list)`;
        }
      }
      return res;
    });

  return {
    view: String(r.view ?? ""),
    photoOk: r.photo_ok !== false,
    retakeReason: String(r.retake_reason ?? ""),
    alsoCheck: String(r.also_check ?? ""),
    findings,
  };
}
