import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Experience from "@/components/Experience";
import Projects from "@/components/Projects";
import Skills from "@/components/Skills";
import Blogs from "@/components/Blogs";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <About />
        <Projects />
        <Experience />
        <Skills />
        <Blogs />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
