"use client";

import { useEffect } from "react";
import { browserClient, isLeaving } from "@/lib/browser";

/**
 * Watches who is signed in on this browser. If that person signs out (in this tab, another tab, or because the
 * session ended) or a different person signs in, the page is loaded fresh, so nothing from the previous
 * account stays in the pages Next.js keeps in the background.
 */
export default function AuthWatch() {
  useEffect(() => {
    const sb = browserClient();
    let current: string | null | undefined;
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      const id = session?.user?.id ?? null;
      if (event === "INITIAL_SESSION" || current === undefined) {
        current = id;
        return;
      }
      if (isLeaving()) return;
      const changed = (event === "SIGNED_OUT" && current !== null) || (id !== null && current !== null && id !== current);
      current = id;
      if (changed) window.location.reload();
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return null;
}
