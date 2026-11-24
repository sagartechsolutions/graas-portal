import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { POLICY_DEFAULTS, type Policy } from "./policy-defaults";
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

export type Term = { years: number; label: string; discount_percent: number };

/** Membership lengths staff have published (1 year, 3 years, lifetime and so on) with their discounts. */
export async function getTerms(): Promise<Term[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("plans");
  try {
    const { data, error } = await publicClient().from("membership_terms").select("years,label,discount_percent").eq("is_published", true).order("sort_order");
    if (error) throw error;
    return (data ?? []).map((t) => ({ ...t, discount_percent: Number(t.discount_percent) })) as Term[];
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

export type Post = {
  slug: string;
  title: string;
  summary: string | null;
  body: string | null;
  category: string;
  cover_url: string | null;
  published_at: string;
};

export async function getPosts(limit = 30): Promise<Post[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  try {
    const { data, error } = await publicClient()
      .from("posts")
      .select("slug,title,summary,body,category,cover_url,published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as Post[];
  } catch {
    return [];
  }
}

export async function getPost(slug: string): Promise<Post | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  try {
    const { data } = await publicClient()
      .from("posts")
      .select("slug,title,summary,body,category,cover_url,published_at")
      .eq("is_published", true)
      .eq("slug", slug)
      .maybeSingle();
    return (data as Post) ?? null;
  } catch {
    return null;
  }
}

export type GalleryItem = { id: string; image_url: string; caption: string | null; credit: string | null; width: number | null; height: number | null };

export async function getGallery(limit = 60): Promise<GalleryItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("gallery");
  try {
    const { data, error } = await publicClient()
      .from("gallery_items")
      .select("id,image_url,caption,credit,width,height")
      .eq("is_published", true)
      .order("sort_order")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as GalleryItem[];
  } catch {
    return [];
  }
}


/** Policies: the text saved by staff in admin, or the starting text when nothing has been saved for that policy. */
export async function getPolicies(): Promise<Policy[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("policies");
  let saved: Policy[] = [];
  try {
    const { data } = await publicClient().from("policies").select("slug,title,summary,body,effective_on").eq("is_published", true);
    saved = (data ?? []) as Policy[];
  } catch {
    saved = [];
  }
  const bySlug = new Map(saved.map((p) => [p.slug, p]));
  const known = POLICY_DEFAULTS.map((d) => bySlug.get(d.slug) ?? d);
  const extra = saved.filter((p) => !POLICY_DEFAULTS.some((d) => d.slug === p.slug));
  return [...known, ...extra];
}

export async function getPolicy(slug: string): Promise<Policy | null> {
  return (await getPolicies()).find((p) => p.slug === slug) ?? null;
}
