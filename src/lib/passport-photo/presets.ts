// Shared by the page and the API routes, so it must stay free of Node imports.

export const PASSPORT_PHOTO_PRICE_INR = 79;

export type Attire = "none" | "suit" | "blazer";

export const ATTIRE: { id: Attire; label: string; hint: string }[] = [
  { id: "none", label: "Keep my clothes", hint: "White background only. Safest for passports." },
  { id: "suit", label: "Formal suit", hint: "Dark suit, white shirt, tie." },
  { id: "blazer", label: "Formal blazer", hint: "Dark blazer over a plain top." },
];

export type PresetId = "india" | "us";

export type Preset = {
  id: PresetId;
  label: string;
  size: string;
  /** Output pixels at 300 DPI. */
  width: number;
  height: number;
  /** Upload limit the file is compressed under. */
  maxKB: number;
};

export const PRESETS: Record<PresetId, Preset> = {
  india: {
    id: "india",
    label: "Indian passport / visa",
    size: "35 × 45 mm",
    width: 413,
    height: 531,
    maxKB: 50,
  },
  us: {
    id: "us",
    label: "US visa / OCI",
    size: "2 × 2 in (51 × 51 mm)",
    width: 600,
    height: 600,
    maxKB: 240,
  },
};

export function isPresetId(value: unknown): value is PresetId {
  return value === "india" || value === "us";
}

export function isAttire(value: unknown): value is Attire {
  return value === "none" || value === "suit" || value === "blazer";
}

/** Crop rectangle as fractions (0–1) of the AI image's width and height. */
export type Crop = { x: number; y: number; w: number; h: number };
