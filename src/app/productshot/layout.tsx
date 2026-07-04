import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { MobileMenuButton } from "@/components/MobileMenuButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Product Shots",
  description: "Daily PM practice questions, articles, and news",
};

export default function ProductShotLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Desktop: Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile: Header with Hamburger */}
      <div className="md:hidden sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Product Shots
        </h1>
        <MobileMenuButton />
      </div>

      {/* Main Content */}
      <div className="flex-1 md:pt-0 pb-20 md:pb-0">
        {children}
      </div>

      {/* Mobile: Bottom Navigation */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </>
  );
}
