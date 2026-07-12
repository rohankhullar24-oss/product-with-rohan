import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Rohan Khullar | Product Manager",
  description: "This page is temporarily unavailable.",
};

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <Navbar />
      <main className="flex flex-1 items-center justify-center bg-white px-6 py-24 text-center dark:bg-slate-950">
        <h1 className="text-3xl font-semibold text-navy dark:text-white sm:text-4xl">
          UNAVAILABLE
        </h1>
      </main>
      <Footer />
    </div>
  );
}
