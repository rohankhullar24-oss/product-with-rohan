import sharp, { type OverlayOptions, type Sharp } from "sharp";
import type { Crop, Preset } from "./presets";

const DPI = 300;
// 6 × 4 in photo paper, the size every print shop and cyber cafe stocks.
const SHEET = { width: 6 * DPI, height: 4 * DPI };

/** Normalises the AI output: flattened onto white, capped size, as a high-quality JPEG. */
export async function normalise(image: Buffer): Promise<{ jpeg: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(image)
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize({ width: 1200, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { jpeg: data, width: info.width, height: info.height };
}

/** A low-res, watermarked copy the browser can show (and crop) before payment. */
export async function preview(jpeg: Buffer, width: number, height: number): Promise<Buffer> {
  const w = Math.min(560, width);
  const h = Math.round((height / width) * w);
  // Shapes, not <text>: serverless runtimes ship no fonts, so SVG text can render as nothing.
  const step = 34;
  const lines: string[] = [];
  for (let d = -h; d < w + h; d += step) {
    lines.push(`<line x1="${d}" y1="0" x2="${d + h}" y2="${h}" />`, `<line x1="${d}" y1="${h}" x2="${d + h}" y2="0" />`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <g stroke="#0f172a" stroke-opacity="0.22" stroke-width="2.5">${lines.join("")}</g></svg>`;
  return sharp(jpeg)
    .resize(w, h)
    .composite([{ input: Buffer.from(svg) }])
    .jpeg({ quality: 70 })
    .toBuffer();
}

function clamp(n: number) {
  return Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
}

async function cropTo(jpeg: Buffer, crop: Crop, preset: Preset): Promise<Sharp> {
  const meta = await sharp(jpeg).metadata();
  const W = meta.width ?? 1;
  const H = meta.height ?? 1;
  const left = Math.round(clamp(crop.x) * W);
  const top = Math.round(clamp(crop.y) * H);
  const width = Math.max(16, Math.min(W - left, Math.round(clamp(crop.w) * W)));
  const height = Math.max(16, Math.min(H - top, Math.round(clamp(crop.h) * H)));
  return sharp(jpeg)
    .extract({ left: Math.min(left, W - width), top: Math.min(top, H - height), width, height })
    .resize(preset.width, preset.height, { fit: "cover" });
}

/** The upload-ready file: exact pixel size, 300 DPI, compressed under the preset's KB limit. */
export async function single(jpeg: Buffer, crop: Crop, preset: Preset): Promise<Buffer> {
  const base = await (await cropTo(jpeg, crop, preset)).png().toBuffer();
  let out = Buffer.alloc(0);
  for (let q = 92; q >= 30; q -= 6) {
    out = await sharp(base).jpeg({ quality: q, mozjpeg: true }).withMetadata({ density: DPI }).toBuffer();
    if (out.length <= preset.maxKB * 1024) break;
  }
  return out;
}

/** A 6 × 4 in print sheet tiled with as many copies as fit, each with a light cut line. */
export async function sheet(jpeg: Buffer, crop: Crop, preset: Preset): Promise<Buffer> {
  const photo = await (await cropTo(jpeg, crop, preset)).jpeg({ quality: 95 }).toBuffer();
  const cols = Math.max(1, Math.floor(SHEET.width / preset.width));
  const rows = Math.max(1, Math.floor(SHEET.height / preset.height));
  const gapX = Math.floor((SHEET.width - cols * preset.width) / (cols + 1));
  const gapY = Math.floor((SHEET.height - rows * preset.height) / (rows + 1));

  const tiles: OverlayOptions[] = [];
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const left = gapX + c * (preset.width + gapX);
      const top = gapY + r * (preset.height + gapY);
      tiles.push({ input: photo, left, top });
      lines.push(
        `<rect x="${left + 0.5}" y="${top + 0.5}" width="${preset.width - 1}" height="${preset.height - 1}" />`
      );
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET.width}" height="${SHEET.height}">
    <g fill="none" stroke="#cbd5e1" stroke-width="1">${lines.join("")}</g></svg>`;
  tiles.push({ input: Buffer.from(svg), left: 0, top: 0 });

  return sharp({ create: { width: SHEET.width, height: SHEET.height, channels: 3, background: "#ffffff" } })
    .composite(tiles)
    .jpeg({ quality: 92 })
    .withMetadata({ density: DPI })
    .toBuffer();
}
