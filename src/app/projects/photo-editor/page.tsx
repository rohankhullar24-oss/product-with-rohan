import type { Metadata } from "next";
import PhotoEditor from "@/components/PhotoEditor";

export const metadata: Metadata = {
  title: "Photo Editor | Layers, Brushes and Filters in the Browser",
  description:
    "A free, Photoshop-lite photo editor that runs entirely in your browser: layers with blend modes, brush and eraser, text, crop, rotate, and non-destructive adjustments. Nothing is uploaded.",
  keywords: ["photo editor", "online image editor", "browser photo editor", "layers", "photoshop alternative"],
  openGraph: {
    type: "website",
    url: "https://productwithrohan.online/projects/photo-editor",
    title: "Photo Editor",
    description: "Layers, brushes, text, crop and filters. Runs in your browser, nothing uploaded.",
  },
};

export default function PhotoEditorPage() {
  return <PhotoEditor />;
}
