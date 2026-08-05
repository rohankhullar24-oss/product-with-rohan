"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function GuestBanner() {
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsGuest(!data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsGuest(!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isGuest) return null;

  return (
    <p className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
      Browsing as a guest.{" "}
      <Link href="/productshot/login" className="text-accent hover:underline">
        Sign in
      </Link>{" "}
      to bookmark articles and shots.
    </p>
  );
}
