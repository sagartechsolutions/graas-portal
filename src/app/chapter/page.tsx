import type { Metadata } from "next";
import { Suspense } from "react";
import ChapterApp from "@/components/chapter/ChapterApp";

export const metadata: Metadata = { title: "Chapter console", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={<div className="shell py-16 text-ink2">Loading…</div>}>
      <ChapterApp />
    </Suspense>
  );
}
