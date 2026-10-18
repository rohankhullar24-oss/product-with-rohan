// Lazy pdf.js loader (browser only). Pinned to 5.4.x: 5.5+ calls
// Map.prototype.getOrInsertComputed, which current Chromium lacks.
export async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs;
}
