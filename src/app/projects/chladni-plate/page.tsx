import type { Metadata } from "next";
import ChladniPlate from "@/components/ChladniPlate";

export const metadata: Metadata = {
  title: "The Chladni Plate | Interactive Standing-Wave Simulator",
  description:
    "Sand on a vibrating steel plate. Tune the frequency, hunt for the 21 resonances, and watch 22,000 grains settle into standing-wave figures. A real physics simulation, built in the browser.",
  keywords: [
    "Chladni plate",
    "Chladni figures",
    "standing waves",
    "resonance simulation",
    "generative art",
    "interactive physics",
  ],
  openGraph: {
    type: "website",
    url: "https://productwithrohan.online/projects/chladni-plate",
    title: "The Chladni Plate",
    description:
      "Tune the dial, find a resonance, and watch 22,000 grains of sand draw the figure for you.",
  },
};

export default function ChladniPlatePage() {
  return <ChladniPlate />;
}
