import type { Attire } from "./presets";

export class ProviderError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Tried in order; quota is per model, same reasoning as /api/inspector. */
function models(): string[] {
  const list = [process.env.PASSPORT_PHOTO_MODEL, "gemini-2.5-flash-image", "gemini-3-pro-image-preview"];
  return [...new Set(list.filter((m): m is string => !!m))];
}

const ATTIRE_PROMPT: Record<Attire, string> = {
  none: "Keep their existing clothing exactly as it is.",
  suit:
    "Dress them in a dark navy formal suit jacket over a crisp white collared shirt with a plain dark tie, fitted naturally at the neck and shoulders.",
  blazer:
    "Dress them in a dark formal blazer over a plain white collared shirt or top, fitted naturally at the neck and shoulders.",
};

function prompt(attire: Attire): string {
  return [
    "Turn this selfie into an official passport photograph.",
    "The person's identity must stay exactly the same: keep the face, facial features, face shape, skin tone, hair, beard, glasses, expression and apparent age unchanged. Do not beautify, smooth skin, slim, or reshape anything.",
    "Replace the background with a plain, uniform pure white (#FFFFFF) background with no texture, gradient, objects or shadows.",
    "Use even, soft frontal lighting with no harsh shadows on the face or behind the head.",
    "Frame it as a straight-on head-and-shoulders portrait: face centred horizontally, looking straight at the camera, a small gap of white above the top of the head, and the tops of the shoulders visible.",
    ATTIRE_PROMPT[attire],
    "Return only the edited photo.",
  ].join(" ");
}

type Part = { text?: string; inlineData?: { mimeType?: string; data?: string }; inline_data?: { data?: string } };

/** Sends the selfie to Gemini's image model and returns the edited image bytes. */
export async function editToPassport(selfieB64: string, mime: string, attire: Attire): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ProviderError("GEMINI_API_KEY is not configured.", 500);

  let lastStatus = 0;
  for (const model of models()) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ inlineData: { mimeType: mime, data: selfieB64 } }, { text: prompt(attire) }] },
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "3:4" },
        },
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
      };
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const b64 = parts.map((p) => p.inlineData?.data ?? p.inline_data?.data).find(Boolean);
      if (!b64) {
        throw new ProviderError(
          `The AI didn't return a photo (${data.candidates?.[0]?.finishReason ?? "blocked"}). Try a clearer, front-facing selfie.`,
          502
        );
      }
      return Buffer.from(b64, "base64");
    }

    lastStatus = res.status;
    console.error("[passport-photo] %s failed", model, res.status, (await res.text()).slice(0, 300));
    // A missing model (404) is worth skipping past; a bad request is not.
    if (res.status !== 429 && res.status !== 503 && res.status !== 404) break;
  }

  if (lastStatus === 429) throw new ProviderError("The AI is at capacity right now. Try again in a minute.", 429);
  if (lastStatus === 503) throw new ProviderError("The AI is overloaded. Try again in a moment.", 503);
  throw new ProviderError(`AI error ${lastStatus}.`, 502);
}
