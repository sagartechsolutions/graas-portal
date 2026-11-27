"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
const STORAGE_KEY = "graas-staff";

/** Browser client for signed-in staff. Row-level security in the database decides what each role can do. */
export function browserClient() {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_KEY!, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: STORAGE_KEY },
  });
  return client;
}

let leaving = false;
/** True while signOutAndReset is taking the browser to a fresh page (AuthWatch then stays out of the way). */
export const isLeaving = () => leaving;

/* ---- Automatic sign-out after inactivity ----------------------------------------------------------------------
 * Anyone signed in is signed out after 30 minutes without activity, unless they said this is their own device.
 * Both values live in this browser only and are shared by all its tabs, so activity in any tab counts. */
export const IDLE_MS = 30 * 60 * 1000;
export const IDLE_WARN_MS = 2 * 60 * 1000;
const OWN_KEY = "graas-own-device"; // the user id that marked this browser as their own
const ACTIVE_KEY = "graas-last-active"; // time of the last activity, in ms

/** Marks (or unmarks) this browser as the signed-in person's own device. Tied to that person only. */
export function setOwnDevice(userId: string | null) {
  try {
    if (userId) localStorage.setItem(OWN_KEY, userId);
    else localStorage.removeItem(OWN_KEY);
  } catch {}
}
export function isOwnDevice(userId: string | null | undefined) {
  try {
    return !!userId && localStorage.getItem(OWN_KEY) === userId;
  } catch {
    return false;
  }
}
export function markActive() {
  try {
    localStorage.setItem(ACTIVE_KEY, String(Date.now()));
  } catch {}
}
export function clearActive() {
  try {
    localStorage.removeItem(ACTIVE_KEY);
  } catch {}
}
export function lastActive() {
  try {
    return Number(localStorage.getItem(ACTIVE_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Signs out and loads a fresh page. Next.js keeps recently visited pages alive in the background (with their
 * forms and data), so a plain in-app navigation after sign-out could show the last person's details to the next
 * person on the same browser. A full page load throws all of that away. Every sign-out button must use this.
 */
export async function signOutAndReset(to = "/") {
  leaving = true;
  const sb = browserClient();
  try {
    const { error } = await sb.auth.signOut();
    // Offline or server trouble: still forget the session on this browser.
    if (error) await sb.auth.signOut({ scope: "local" });
  } catch {
    try {
      await sb.auth.signOut({ scope: "local" });
    } catch {}
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}-code-verifier`);
    // The next person on this browser is asked again whether it is their own device.
    localStorage.removeItem(OWN_KEY);
    localStorage.removeItem(ACTIVE_KEY);
    sessionStorage.clear();
  } catch {}
  window.location.replace(to);
}


export type PortalResult = { ok: boolean; error?: string; field?: string; [k: string]: unknown };

/** Calls the server-side `portal` function (accounts, payments). Network trouble comes back as a plain message. */
export async function portal(action: string, body: Record<string, unknown> = {}, fn = "portal"): Promise<PortalResult> {
  try {
    const { data, error } = await browserClient().functions.invoke(fn, { body: { action, ...body } });
    if (error || !data) return { ok: false, error: "Could not reach the server. Check your internet and try again." };
    return data as PortalResult;
  } catch {
    return { ok: false, error: "Could not reach the server. Check your internet and try again." };
  }
}

/** Calls the `whatsapp-admin` function (Meta set-up, number registration, WhatsApp profile, inbox replies). Staff only. */
export const waAdmin = (action: string, body: Record<string, unknown> = {}) => portal(action, body, "whatsapp-admin");
