"use client";

import { Fragment, useLayoutEffect, useState, type ReactNode } from "react";

/**
 * Rebuilds its contents from scratch whenever the page is hidden. Next.js keeps up to three visited pages alive in
 * the background, with whatever was typed in them. Sign-up, sign-in and password forms hold personal details and
 * passwords, so they are wrapped in this and always start empty: nothing one person typed can appear for the next.
 */
export default function FreshOnShow({ children }: { children: ReactNode }) {
  const [round, setRound] = useState(0);
  // The clean-up runs when Next.js hides the page; a new key throws the old form and its state away.
  useLayoutEffect(() => () => setRound((r) => r + 1), []);
  return <Fragment key={round}>{children}</Fragment>;
}
