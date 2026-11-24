"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Opens every new page at the top. Next.js 16 keeps the scroll position when the next page is still in view,
 * which made a click on a menu item land halfway down the new page. Back and forward keep the browser's own
 * position, and links to a #section still go to that section.
 */
export default function ScrollReset() {
  const pathname = usePathname();
  const first = useRef(true);
  const popped = useRef(false);
  useEffect(() => {
    const onPop = () => {
      popped.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (popped.current) {
      popped.current = false;
      return;
    }
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}
