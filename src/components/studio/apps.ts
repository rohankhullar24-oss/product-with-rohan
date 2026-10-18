export type StudioApp = {
  slug: string;
  name: string;
  replaces: string;
  tagline: string;
  features: string[];
};

// One entry per app, mirroring ArtCraft's seven Craft apps.
export const STUDIO_APPS: StudioApp[] = [
  {
    slug: "photo",
    name: "Photo",
    replaces: "Photoshop",
    tagline: "Layered image editing",
    features: ["Layers + 16 blend modes", "Brush, eraser, text, eyedropper", "Crop, rotate, flip", "Editable adjustments"],
  },
  {
    slug: "vector",
    name: "Vector",
    replaces: "Illustrator",
    tagline: "Vector drawing and illustration",
    features: ["Pen, pencil, shapes, text", "Unite, subtract, intersect, exclude", "Gradients, align, z-order", "SVG and PNG export"],
  },
  {
    slug: "video",
    name: "Video",
    replaces: "Premiere Pro",
    tagline: "Multi-track video editing",
    features: ["Video, overlay, title and audio tracks", "Trim, split, ripple delete", "Fades, volume, markers, J/K/L", "WebM export"],
  },
  {
    slug: "develop",
    name: "Develop",
    replaces: "Lightroom",
    tagline: "Photo library and develop",
    features: ["Library with ratings and filmstrip", "Exposure, tone, white balance", "Tone curve and HSL mixer", "Histogram, before/after, sync"],
  },
  {
    slug: "motion",
    name: "Motion",
    replaces: "After Effects",
    tagline: "Keyframed motion graphics",
    features: ["Text, shape and image layers", "Keyframes with easing", "One-click animation presets", "WebM and frame export"],
  },
  {
    slug: "design",
    name: "Design",
    replaces: "InDesign",
    tagline: "Multi-page layout",
    features: ["Text, image and shape frames", "Pages, margins and column guides", "Snapping and alignment", "Real PDF export"],
  },
  {
    slug: "pdf",
    name: "PDF",
    replaces: "Acrobat",
    tagline: "Edit, merge and sign PDFs",
    features: ["Merge, reorder, rotate, delete", "Extract pages, images to PDF", "Add text, shapes and signatures", "Page numbers and watermark"],
  },
];
