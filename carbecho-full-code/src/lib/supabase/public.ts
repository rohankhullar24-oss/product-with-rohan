import { createClient } from "@supabase/supabase-js";

// A cookie-free Supabase client for reading data that's already publicly
// readable (shots, news). Unlike the server client in ./server.ts, this
// never touches request cookies, so pages using it can stay statically
// cached/ISR'd instead of being forced into per-request dynamic rendering.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
