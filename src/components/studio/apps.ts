export type StudioApp = {
  slug: string;
  group: "creative" | "work";
  name: string;
  replaces: string;
  tagline: string;
  features: string[];
};

// Creative apps mirror ArtCraft's seven Craft apps; the work apps port the
// Reminders app's "Works Enabler" document toolkit to the browser.
export const STUDIO_APPS: StudioApp[] = [
  {
    slug: "photo",
    group: "creative",
    name: "Photo",
    replaces: "Photoshop",
    tagline: "Layered image editing",
    features: ["Layers + 16 blend modes", "Brush, eraser, text, eyedropper", "Crop, rotate, flip", "Editable adjustments"],
  },
  {
    slug: "vector",
    group: "creative",
    name: "Vector",
    replaces: "Illustrator",
    tagline: "Vector drawing and illustration",
    features: ["Pen, pencil, shapes, text", "Unite, subtract, intersect, exclude", "Gradients, align, z-order", "SVG and PNG export"],
  },
  {
    slug: "video",
    group: "creative",
    name: "Video",
    replaces: "Premiere Pro",
    tagline: "Multi-track video editing",
    features: ["Video, overlay, title and audio tracks", "Trim, split, ripple delete", "Fades, volume, markers, J/K/L", "WebM export"],
  },
  {
    slug: "develop",
    group: "creative",
    name: "Develop",
    replaces: "Lightroom",
    tagline: "Photo library and develop",
    features: ["Library with ratings and filmstrip", "Exposure, tone, white balance", "Tone curve and HSL mixer", "Histogram, before/after, sync"],
  },
  {
    slug: "motion",
    group: "creative",
    name: "Motion",
    replaces: "After Effects",
    tagline: "Keyframed motion graphics",
    features: ["Text, shape and image layers", "Keyframes with easing", "One-click animation presets", "WebM and frame export"],
  },
  {
    slug: "design",
    group: "creative",
    name: "Design",
    replaces: "InDesign",
    tagline: "Multi-page layout",
    features: ["Text, image and shape frames", "Pages, margins and column guides", "Snapping and alignment", "Real PDF export"],
  },
  {
    slug: "pdf",
    group: "work",
    name: "PDF",
    replaces: "Acrobat",
    tagline: "Edit, merge and sign PDFs",
    features: ["Merge, reorder, rotate, split, extract", "Compress, unlock, password-protect", "Text, highlights and signatures", "Convert to Word, photos to PDF"],
  },
  {
    slug: "docs",
    group: "work",
    name: "Docs",
    replaces: "Word",
    tagline: "Write and edit .docx",
    features: ["Open, create and save .docx", "Bold and italic paragraphs", "Convert to PDF", "Compress a Word file"],
  },
  {
    slug: "sheets",
    group: "work",
    name: "Sheets",
    replaces: "Excel",
    tagline: "Edit a data grid in .xlsx",
    features: ["Open, create and save .xlsx", "Add and delete rows and columns", "CSV import and export", "Other sheets kept as they are"],
  },
  {
    slug: "slides",
    group: "work",
    name: "Slides",
    replaces: "PowerPoint",
    tagline: "Outline a .pptx deck",
    features: ["Open, create and save .pptx", "Slide titles and bullet text", "Reorder, duplicate, delete", "Theme colors"],
  },
  {
    slug: "viewer",
    group: "work",
    name: "Viewer",
    replaces: "Office viewer",
    tagline: "See Office files as they look",
    features: ["Word, PowerPoint and Excel", "Layout, images and colors", "Read-only, nothing uploaded", "Hand off to the editors"],
  },
  {
    slug: "ocr",
    group: "work",
    name: "Scan",
    replaces: "Acrobat Scan",
    tagline: "Turn photos into text",
    features: ["Photo or camera capture", "12 languages", "Copy, .txt or Word", "Searchable PDF"],
  },
  {
    slug: "zip",
    group: "work",
    name: "Zip",
    replaces: "WinZip",
    tagline: "Open and make zip files",
    features: ["Browse and preview contents", "Password-protected zips", "Extract to a folder", "Create zips with AES password"],
  },
];
