import { NextRequest, NextResponse } from "next/server";
import { INSPECTOR_SYSTEM_PROMPT, RESPONSE_SCHEMA } from "@/lib/inspector/prompt";
import { saveFinding } from "@/lib/inspector/store";

export const runtime = "nodejs";
export const maxDuration = 30;

type Turn = { role: "user" | "model"; text: string };
type Image = { mimeType: string; data: string };

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: INSPECTOR_SYSTEM_PROMPT + languageRule }] },
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048,
            // Thinking costs ~10s per turn here and does not improve the call.
            // This is a voice tool - the inspector is standing in silence while it runs.
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("[inspector] gemini error", response.status, detail.slice(0, 500));

      // Don't hide a rate limit behind a generic failure - the inspector needs
      // to know it is a wait, not a break. The free tier caps this model at 20
      // requests a minute, which a real inspection run will hit.
      if (response.status === 429) {
        const seconds = detail.match(/retry in ([\d.]+)s/i)?.[1];
        const wait = seconds ? ` Try again in about ${Math.ceil(Number(seconds))} seconds.` : "";
        return NextResponse.json(
          { error: `Too many requests in the last minute.${wait}` },
          { status: 429 }
        );
      }

      if (response.status === 503) {
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

    return NextResponse.json({ ...answer, saved });
  } catch (error) {
    console.error("[inspector] request failed", error);
    return NextResponse.json({ error: "The co-pilot is unavailable right now." }, { status: 500 });
  }
}
