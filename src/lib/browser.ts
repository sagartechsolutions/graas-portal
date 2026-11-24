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

export type PortalResult = { ok: boolean; error?: string; field?: string; [k: string]: unknown };

/** Calls the server-side `portal` function (accounts, payments). Network trouble comes back as a plain message. */
export async function portal(action: string, body: Record<string, unknown> = {}): Promise<PortalResult> {
  try {
    const { data, error } = await browserClient().functions.invoke("portal", { body: { action, ...body } });
    if (error || !data) return { ok: false, error: "Could not reach the server. Check your internet and try again." };
    return data as PortalResult;
  } catch {
    return { ok: false, error: "Could not reach the server. Check your internet and try again." };
  }
}
