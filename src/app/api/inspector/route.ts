import { NextRequest, NextResponse } from "next/server";
import { INSPECTOR_SYSTEM_PROMPT, RESPONSE_SCHEMA } from "@/lib/inspector/prompt";
import { saveFinding } from "@/lib/inspector/store";

export const runtime = "nodejs";
export const maxDuration = 30;

type Turn = { role: "user" | "model"; text: string };
type Image = { mimeType: string; data: string };

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

/**
 * Tried in order. Gemini quota is per model, so a second model is not just a
 * backup for outages - it doubles the free tier's daily allowance and covers
 * the 503s the newer models throw under load.
 *
 * 2.5-flash leads on answer quality for this task; 3.5-flash-lite is faster
 * (1.5s vs 2.3s measured) and rejects thinkingConfig outright, hence the flag.
 */
const MODELS: { name: string; disableThinking: boolean }[] = [
  { name: "gemini-2.5-flash", disableThinking: true },
  { name: "gemini-3.5-flash-lite", disableThinking: false },
];

const MAX_TURNS = 12;
const MAX_CHARS = 1200;
const MAX_IMAGE_BYTES = 4_000_000;
const MAX_THUMB_BYTES = 60_000;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as {
    turns?: Turn[];
    image?: Image | null;
    lang?: string;
    thumb?: string | null;
  } | null;

  const turns = Array.isArray(body?.turns) ? body!.turns : null;

  if (!turns || turns.length === 0) {
    return NextResponse.json({ error: "No conversation turns supplied." }, { status: 400 });
  }

  // The UI's language toggle is authoritative. Left to "mirror the inspector"
  // the model answered English questions in Hinglish.
  const languageRule =
    body?.lang === "en-IN"
      ? "\n\nLANGUAGE FOR THIS REPLY: answer in English only. No Hindi words."
      : "\n\nLANGUAGE FOR THIS REPLY: answer in conversational Hinglish.";

  const image = body?.image ?? null;
  if (image) {
    if (!ALLOWED_IMAGE_TYPES.includes(image.mimeType)) {
      return NextResponse.json({ error: "Unsupported image format." }, { status: 400 });
    }
    if (typeof image.data !== "string" || image.data.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "That photo is too large." }, { status: 413 });
    }
  }

  const contents = turns
    .slice(-MAX_TURNS)
    .filter((turn) => typeof turn?.text === "string" && turn.text.trim().length > 0)
    .map((turn) => ({
      role: turn.role === "model" ? "model" : "user",
      parts: [{ text: turn.text.slice(0, MAX_CHARS) }] as Part[],
    }));

  if (contents.length === 0 || contents[contents.length - 1].role !== "user") {
    return NextResponse.json({ error: "Last turn must be from the inspector." }, { status: 400 });
  }

  // The photo belongs to the question being asked right now, so it rides on the final user turn.
  if (image) {
    contents[contents.length - 1].parts.unshift({
      inlineData: { mimeType: image.mimeType, data: image.data },
    });
  }

  try {
    const generationConfig: Record<string, unknown> = {
      temperature: 0.4,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    };

    let response: Response | null = null;
    let usedModel = "";
    let lastStatus = 0;
    let lastDetail = "";

    for (const model of MODELS) {
      const attempt = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: INSPECTOR_SYSTEM_PROMPT + languageRule }] },
            generationConfig: model.disableThinking
              ? // Thinking costs ~10s per turn on 2.5-flash and adds nothing here.
                { ...generationConfig, thinkingConfig: { thinkingBudget: 0 } }
              : generationConfig,
          }),
        }
      );

      if (attempt.ok) {
        response = attempt;
        usedModel = model.name;
        break;
      }

      lastStatus = attempt.status;
      lastDetail = await attempt.text();
      console.error("[inspector] %s failed", model.name, attempt.status, lastDetail.slice(0, 300));

      // Only quota and overload are worth retrying elsewhere. A 400 is our bug
      // and will fail identically on every model.
      if (attempt.status !== 429 && attempt.status !== 503) break;
    }

    if (usedModel !== MODELS[0].name && response) {
      console.warn("[inspector] answered by fallback model", usedModel);
    }

    if (!response) {
      const detail = lastDetail;
      const status = lastStatus;

      // Don't hide a rate limit behind a generic failure - the inspector needs
      // to know it is a wait, not a break. Reaching here means every model in
      // MODELS refused, so the whole free-tier allowance is gone, not just one.
      if (status === 429) {
        // Google returns two very different limits through the same status.
        // Saying "wait a minute" when the day's quota is gone sends the
        // inspector back to a tool that cannot answer for hours.
        const perDay = /PerDay|RequestsPerDay/i.test(detail);
        const seconds = detail.match(/retry in ([\d.]+)s/i)?.[1];
        const cap = detail.match(/limit:\s*(\d+)/i)?.[1];

        const error = perDay
          ? `Daily quota used up on every model${
              cap ? ` (${cap} requests a day each on the free tier)` : ""
            }. It resets at midnight US Pacific — about 12:30 PM India time. Enabling billing on the API key removes the cap.`
          : `Too many requests just now.${
              seconds ? ` Try again in about ${Math.ceil(Number(seconds))} seconds.` : ""
            }`;

        return NextResponse.json({ error }, { status: 429 });
      }

      if (status === 503) {
        return NextResponse.json(
          { error: "The model is overloaded right now. Ask again in a moment." },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: "The co-pilot could not reach the model." }, { status: 502 });
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const raw = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    if (!raw.trim()) {
      return NextResponse.json({ error: "The co-pilot returned an empty answer." }, { status: 502 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      parsed = { say: raw };
    }

    const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

    const answer = {
      say: str(parsed.say) || "Sir, ye samajh nahi aaya. Ek baar dobara boliye.",
      section: str(parsed.section),
      item: str(parsed.item),
      severity: str(parsed.severity),
      action: str(parsed.action),
    };

    const thumb =
      typeof body?.thumb === "string" && body.thumb.length <= MAX_THUMB_BYTES
        ? body.thumb
        : null;

    const saved = await saveFinding({
      ...answer,
      question: contents[contents.length - 1].parts
        .filter((part): part is { text: string } => "text" in part)
        .map((part) => part.text)
        .join(" ")
        .slice(0, MAX_CHARS),
      lang: body?.lang === "en-IN" ? "en-IN" : "hi-IN",
      thumb,
      has_photo: Boolean(image),
    });

    return NextResponse.json({ ...answer, saved, model: usedModel });
  } catch (error) {
    console.error("[inspector] request failed", error);
    return NextResponse.json({ error: "The co-pilot is unavailable right now." }, { status: 500 });
  }
}
