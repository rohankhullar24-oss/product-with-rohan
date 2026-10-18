import type { Metadata } from "next";
import ClientOnly from "@/components/studio/ClientOnly";
import SheetsApp from "@/components/studio/SheetsApp";

export const metadata: Metadata = {
  title: "Sheets | Open Studio",
  description:
    "A free, Excel-lite grid editor in your browser: open, edit and save .xlsx or CSV, add and delete rows and columns, with other sheets kept intact. Nothing is uploaded.",
};

export default function SheetsPage() {
  return (
    <ClientOnly>
      <SheetsApp />
    </ClientOnly>
  );
}
