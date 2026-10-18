"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ReminderAlerts from "@/components/journey/ReminderAlerts";

const NAV = [
  { href: "/journey/entries", label: "Journal" },
  { href: "/journey/trips", label: "Trips" },
  { href: "/journey/calendar", label: "Calendar" },
  { href: "/journey/reminders", label: "Reminders" },
  { href: "/journey/notes", label: "Notes" },
  { href: "/journey/messages", label: "Messages" },
];

export default function JourneyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const isLogin = pathname === "/journey/login";

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/journey/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {!isLogin && (
        <header className="border-b border-slate/15 px-6 py-4">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <nav className="flex items-center gap-5 overflow-x-auto text-sm font-medium text-slate">
              <Link href="/journey" className="shrink-0 text-navy dark:text-foreground">
                Journey
              </Link>
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 hover:text-accent ${pathname.startsWith(item.href) ? "text-accent" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <button onClick={signOut} className="shrink-0 text-sm text-slate underline-offset-2 hover:underline">
              Sign out
            </button>
          </div>
        </header>
      )}
      {!isLogin && <ReminderAlerts />}
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
