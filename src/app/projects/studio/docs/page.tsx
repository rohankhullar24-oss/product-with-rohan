import type { Metadata } from "next";
import ClientOnly from "@/components/studio/ClientOnly";
import DocsApp from "@/components/studio/DocsApp";

export const metadata: Metadata = {
  title: "Docs | Open Studio",
  description:
    "A free, Word-lite editor in your browser: open, write and save .docx files, bold and italic paragraphs, convert to and from PDF, and shrink Office files. Nothing is uploaded.",
};

export default function DocsPage() {
  return (
    <ClientOnly>
      <DocsApp />
    </ClientOnly>
  );
}
