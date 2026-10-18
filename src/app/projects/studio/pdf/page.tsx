import type { Metadata } from "next";
import ClientOnly from "@/components/studio/ClientOnly";
import PdfApp from "@/components/studio/PdfApp";

export const metadata: Metadata = {
  title: "PDF | Open Studio",
  description:
    "A free, Acrobat-lite PDF tool in your browser: merge, reorder, rotate, extract and split pages, add text, highlights and signatures, page numbers and watermarks. Files never leave your device.",
};

export default function PdfPage() {
  return (
    <ClientOnly>
      <PdfApp />
    </ClientOnly>
  );
}
