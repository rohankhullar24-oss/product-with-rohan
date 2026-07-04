import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProductShotHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/productshot/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-32 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-accent">
        Product Shots
      </p>
      <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight text-navy dark:text-foreground sm:text-5xl">
        Finshots for product managers.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-slate">
        One weekly article, the corporate &amp; AI news PMs actually need, and a
        daily product-sense question with a full worked answer.
      </p>
      <Link
        href="/productshot/login"
        className="mt-10 rounded-full bg-accent px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Get started
      </Link>
    </div>
  );
}
