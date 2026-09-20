"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <nav className="flex items-center gap-5 text-sm font-medium text-slate">
              <Link href="/journey" className="text-navy dark:text-foreground">
                Journey
              </Link>
              <Link href="/journey/entries" className="hover:text-accent">
                Journal
              </Link>
              <Link href="/journey/trips" className="hover:text-accent">
                Trips
              </Link>
            </nav>
            <button onClick={signOut} className="text-sm text-slate underline-offset-2 hover:underline">
              Sign out
            </button>
          </div>
        </header>
      )}
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
