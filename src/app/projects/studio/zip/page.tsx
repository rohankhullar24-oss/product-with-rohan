import type { Metadata } from "next";
import ClientOnly from "@/components/studio/ClientOnly";
import ZipApp from "@/components/studio/ZipApp";

export const metadata: Metadata = {
  title: "Zip | Open Studio",
  description:
    "Open, preview and extract zip files in your browser, including password-protected ones, and create new zips with optional AES-256 passwords. Nothing is uploaded.",
};

export default function ZipPage() {
  return (
    <ClientOnly>
      <ZipApp />
    </ClientOnly>
  );
}
