/**
 * Data + helpers for the CarBecho interactive inspection flow at /carbecho.
 *
 * The checklist here is a demo-scale stand-in for the real 200-point sheet:
 * 8 sections, 40 grouped checks, weighted to the same point totals a field
 * inspector sees. The `ai` hints are the pre-fills a Co-Pilot job arrives with.
 */

export type Severity = "Minor" | "Major" | "Critical";

export type AiHint = { v: "pass" | "fail"; src: string; sev?: Severity };

export type ChecklistItem = { n: string; ai?: AiHint };

export type Section = {
  id: string;
  name: string;
  pts: number;
  icon: string;
  items: ChecklistItem[];
};

export type Job = {
  id: string;
  car: string;
  year: string;
  reg: string;
  seller: string;
  slot: string;
  addr: string;
  quote: string;
  copilot: boolean;
};

/** Palette. Kept in one place so the flow and the chat sheet never drift. */
export const C = {
  purple: "#5B2EDD",
  purpleDark: "#3C1AA6",
  ink: "#171221",
  sub: "#6B6478",
  bg: "#F5F3FA",
  card: "#FFFFFF",
  line: "#E7E2F2",
  pass: "#0E9F6E",
  passBg: "#E3F5EE",
  fail: "#E0284A",
  failBg: "#FCE8ED",
  na: "#8B8598",
  naBg: "#EFEDF4",
  amber: "#C77700",
  amberBg: "#FFF3E0",
  ai: "#7C4DFF",
  aiBg: "#F1EBFF",
} as const;

export const SECTIONS: Section[] = [
  {
    id: "body",
    name: "Bodywork & Paint",
    pts: 32,
    icon: "🚗",
    items: [
      { n: "Panel paint depth — all 12 panels", ai: { v: "pass", src: "Photo AI · paint-meter OCR: 98–128µ, OEM range" } },
      { n: "Dents / scratches (exterior 360°)", ai: { v: "fail", src: "Photo AI: dent detected, rear-left door", sev: "Minor" } },
      { n: "Repaint / putty detection", ai: { v: "fail", src: "Photo AI: repaint signature, front bumper", sev: "Minor" } },
      { n: "Structural / pillar damage" },
      { n: "Door seals & panel lining" },
      { n: "Windshield & glass condition", ai: { v: "pass", src: "Photo AI: no cracks or chips detected" } },
    ],
  },
  {
    id: "lights",
    name: "Lights & Signals",
    pts: 18,
    icon: "💡",
    items: [
      { n: "Headlamps — low & high beam" },
      { n: "Tail / brake / reverse lamps" },
      { n: "Indicators & hazard function" },
      { n: "Lamp casings — chips / moisture", ai: { v: "pass", src: "Photo AI: casings intact" } },
    ],
  },
  {
    id: "engine",
    name: "Engine & Transmission",
    pts: 38,
    icon: "⚙️",
    items: [
      { n: "Cold start & idle stability", ai: { v: "pass", src: "OBD: idle RPM 780, stable" } },
      { n: "Engine error codes (OBD scan)", ai: { v: "fail", src: "OBD: P0420 — catalytic efficiency low", sev: "Major" } },
      { n: "Oil condition & leaks" },
      { n: "Radiator / coolant / hoses" },
      { n: "Battery health", ai: { v: "pass", src: "OBD: 12.6V, CCA 92%" } },
      { n: "Clutch / gearshift quality" },
    ],
  },
  {
    id: "under",
    name: "Undercarriage & Suspension",
    pts: 22,
    icon: "🔩",
    items: [
      { n: "Chassis rust / accident repair" },
      { n: "Suspension bounce & noise" },
      { n: "Exhaust leaks & mounting" },
      { n: "Underbody oil seepage" },
    ],
  },
  {
    id: "tyres",
    name: "Tyres & Wheels",
    pts: 14,
    icon: "🛞",
    items: [
      { n: "Tread depth — all 5 tyres", ai: { v: "pass", src: "Photo AI: 4.2–5.1mm, above limit" } },
      { n: "Uneven wear (alignment signal)" },
      { n: "Rim damage / bends", ai: { v: "pass", src: "Photo AI: no visible rim damage" } },
      { n: "Manufacturing year match" },
    ],
  },
  {
    id: "interior",
    name: "Interior & Electronics",
    pts: 34,
    icon: "🪑",
    items: [
      { n: "Upholstery — tears, stains, odour", ai: { v: "pass", src: "Photo AI: upholstery clean" } },
      { n: "Seat adjust / recline / rails" },
      { n: "AC cooling & blower speeds" },
      { n: "Power windows & mirrors" },
      { n: "Infotainment / horn / wipers" },
      { n: "Airbag & warning lamps", ai: { v: "pass", src: "OBD: no SRS faults" } },
    ],
  },
  {
    id: "drive",
    name: "Road Test",
    pts: 26,
    icon: "🛣️",
    items: [
      { n: "Acceleration & power delivery" },
      { n: "Braking — bite, pull, ABS", ai: { v: "pass", src: "OBD: ABS active, no faults" } },
      { n: "Steering play & alignment" },
      { n: "NVH — cabin noise / vibration" },
      { n: "Odometer vs OBD reading", ai: { v: "pass", src: "OBD 48,212 km = odo reading" } },
    ],
  },
  {
    id: "docs",
    name: "Documents & History",
    pts: 16,
    icon: "📄",
    items: [
      { n: "RC verification (owner, VIN)", ai: { v: "pass", src: "VAHAN API: RC valid, 1st owner, VIN match" } },
      { n: "Insurance validity", ai: { v: "pass", src: "VAHAN API: valid till Mar 2027" } },
      { n: "Hypothecation / loan status", ai: { v: "fail", src: "VAHAN API: HDFC hypothecation active", sev: "Major" } },
      { n: "Challan / blacklist check", ai: { v: "pass", src: "VAHAN API: no pending challans" } },
      { n: "Service history records" },
    ],
  },
];

export const JOBS: Job[] = [
  {
    id: "manual",
    car: "Maruti Baleno Zeta 1.2",
    year: "2021 · Petrol · 48,212 km",
    reg: "HR 26 DQ 5544",
    seller: "Ankit Sharma",
    slot: "10:30 AM",
    addr: "Sector 57, Gurugram · 4.2 km",
    quote: "₹6.10L",
    copilot: false,
  },
  {
    id: "copilot",
    car: "Honda City ZX 1.5 CVT",
    year: "2022 · Petrol · 31,850 km",
    reg: "DL 7C AK 9901",
    seller: "Priya Mehta",
    slot: "12:00 PM",
    addr: "Dwarka Sec 12, Delhi · 6.8 km",
    quote: "₹9.40L",
    copilot: true,
  },
];

export const AI_HINT_COUNT = SECTIONS.reduce(
  (total, section) => total + section.items.filter((item) => item.ai).length,
  0
);

export const TOTAL_CHECKS = SECTIONS.reduce((total, section) => total + section.items.length, 0);

export type ItemRef = { sectionIndex: number; itemIndex: number; label: string; section: string };

const STOP = new Set([
  "the", "and", "for", "with", "all", "any", "car", "check", "checks", "condition", "vehicle",
]);

const words = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word.length > 2 && !STOP.has(word));

const overlaps = (word: string, target: string[]) =>
  target.some((candidate) => candidate === word || candidate.startsWith(word) || word.startsWith(candidate));

/**
 * The model answers with its own free-text section and item names, which come
 * from the generic 200-point vocabulary and rarely match a checklist row
 * verbatim ("Fuel leakage" vs "Underbody oil seepage"). Score every row on word
 * overlap - item words count double - and only claim a match above a floor,
 * because silently marking the wrong row is worse than offering no button.
 */
export function resolveChecklistItem(sectionGuess: string, itemGuess: string): ItemRef | null {
  const itemWords = words(itemGuess);
  const sectionWords = words(sectionGuess);
  if (itemWords.length === 0 && sectionWords.length === 0) return null;

  let best: ItemRef | null = null;
  let bestScore = 0;

  SECTIONS.forEach((section, sectionIndex) => {
    const sectionTokens = words(section.name);
    section.items.forEach((item, itemIndex) => {
      const itemTokens = words(item.n);
      let score = 0;
      itemWords.forEach((word) => {
        if (overlaps(word, itemTokens)) score += 2;
        else if (overlaps(word, sectionTokens)) score += 1;
      });
      sectionWords.forEach((word) => {
        if (overlaps(word, sectionTokens)) score += 1;
      });
      if (score > bestScore) {
        bestScore = score;
        best = { sectionIndex, itemIndex, label: item.n, section: section.name };
      }
    });
  });

  return bestScore >= 3 ? best : null;
}
