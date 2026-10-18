import JSZip from "jszip";

// Port of reminder-app's OoxmlCompressor.kt: shrinks any .docx/.pptx/.xlsx
// without parsing its XML, by rezipping at maximum DEFLATE and re-encoding
// embedded JPEGs (only kept when the result is actually smaller).

export type CompressResult = { blob: Blob; before: number; after: number; images: number };

async function recompressJpeg(bytes: Uint8Array, quality: number): Promise<Uint8Array | null> {
  try {
    const bmp = await createImageBitmap(new Blob([bytes as BlobPart], { type: "image/jpeg" }));
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob) return null;
    const out = new Uint8Array(await blob.arrayBuffer());
    return out.length < bytes.length ? out : null;
  } catch {
    return null;
  }
}

export async function compressOoxml(file: Blob, quality = 0.6): Promise<CompressResult> {
  const zip = await JSZip.loadAsync(file);
  let images = 0;
  for (const name of Object.keys(zip.files)) {
    if (!/\/media\/[^/]+\.(jpe?g)$/i.test(name)) continue;
    const smaller = await recompressJpeg(await zip.file(name)!.async("uint8array"), quality);
    if (smaller) {
      zip.file(name, smaller);
      images++;
    }
  }
  const blob = await zip.generateAsync({ type: "blob", mimeType: file.type, compression: "DEFLATE", compressionOptions: { level: 9 } });
  // Never hand back something bigger than what came in.
  return blob.size < file.size ? { blob, before: file.size, after: blob.size, images } : { blob: file, before: file.size, after: file.size, images: 0 };
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
