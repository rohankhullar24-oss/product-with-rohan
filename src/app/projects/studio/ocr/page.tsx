import type { Metadata } from "next";
import ClientOnly from "@/components/studio/ClientOnly";
import OcrApp from "@/components/studio/OcrApp";

export const metadata: Metadata = {
  title: "Scan | Open Studio",
  description:
    "Free OCR in your browser: turn a photo or scanned page into editable text in 12 languages, then copy it or save it as text, Word or a searchable PDF.",
};

export default function OcrPage() {
  return (
    <ClientOnly>
      <OcrApp />
    </ClientOnly>
  );
}
