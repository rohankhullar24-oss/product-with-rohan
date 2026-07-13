import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Projects from "@/components/Projects";
import Skills from "@/components/Skills";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Rohan Khullar | Product Manager | AI & Fintech Growth Strategy",
  description:
    "Product Manager with 4+ years driving product strategy for B2B fintech. Expertise in platform growth, payments, and AI automation. 600K+ users, ₹7Cr GMV, 73% conversion.",
  openGraph: {
    type: "website",
    url: "https://productwithrohan.online",
    title: "Rohan Khullar | Product Manager",
    description:
      "Product Manager with 4+ years driving product strategy for B2B fintech.",
  },
};

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Projects />
        <Skills />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
