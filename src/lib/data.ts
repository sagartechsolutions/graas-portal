import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import type { Plan } from "./site";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_KEY!;

/** Public, read-only client. Row-level security decides what it can see. */
export function publicClient() {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Published membership plans. Prices are set in admin; a null price means "not announced yet". */
export async function getPlans(): Promise<Plan[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("plans");
  try {
    const { data, error } = await publicClient()
      .from("membership_plans")
      .select("code,audience,name,tagline,duration_months,price_inr,gst_percent,benefits,requires_approval")
      .eq("is_published", true)
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as Plan[];
  } catch {
    return [];
  }
}

export type Graascon = { year: number; dates: string | null; venue: string | null; cfp_url: string | null };

export async function getGraascon(): Promise<Graascon> {
  "use cache";
  cacheLife("minutes");
  cacheTag("settings");
  const fallback: Graascon = { year: 2027, dates: null, venue: null, cfp_url: null };
  try {
    const { data } = await publicClient().from("site_settings").select("value").eq("key", "graascon").maybeSingle();
    return { ...fallback, ...((data?.value as Partial<Graascon>) ?? {}) };
  } catch {
    return fallback;
  }
}
