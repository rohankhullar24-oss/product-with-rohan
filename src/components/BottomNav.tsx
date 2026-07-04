"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = "shots" | "articles" | "news" | "bookmarks";

const tabs: { id: Tab; label: string; href: string; icon: React.ReactNode }[] =
  [
    {
      id: "shots",
      label: "Shots",
      href: "/productshot/shots",
      icon: (
        <svg
          className="h-6 w-6"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      id: "articles",
      label: "Articles",
      href: "/productshot/articles",
      icon: (
        <svg
          className="h-6 w-6"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z" />
        </svg>
      ),
    },
    {
      id: "news",
      label: "News",
      href: "/productshot/news",
      icon: (
        <svg
          className="h-6 w-6"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
        </svg>
      ),
    },
    {
      id: "bookmarks",
      label: "Bookmarks",
      href: "/productshot/bookmarks",
      icon: (
        <svg
          className="h-6 w-6"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
        </svg>
      ),
    },
  ];

export function BottomNav() {
  const pathname = usePathname();

  const getActiveTab = (): Tab => {
    if (pathname === "/shots" || pathname.startsWith("/shots/")) return "shots";
    if (pathname === "/articles" || pathname.startsWith("/articles/")) return "articles";
    if (pathname === "/news") return "news";
    if (pathname === "/bookmarks") return "bookmarks";
    if (pathname === "/" || pathname === "/dashboard") return "shots";
    return "shots";
  };

  const activeTab = getActiveTab();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "text-accent"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
