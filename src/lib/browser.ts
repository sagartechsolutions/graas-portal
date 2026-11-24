"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Browser client for signed-in staff. Row-level security in the database decides what each role can do. */
export function browserClient() {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_KEY!, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "graas-staff" },
  });
  return client;
}
