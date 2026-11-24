import type { Metadata } from "next";
import { Suspense } from "react";
import LetterApp from "@/components/chapter/LetterApp";
import { getChapterSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Principal's letter template", description: "The letter a principal signs to ask GRAAS to form a college or school chapter. Fill it in online, print it, or download it for Word." };

export default async function Page() {
  const s = await getChapterSettings();
  return (
    <Suspense fallback={<div className="shell py-16 text-ink2">Loading…</div>}>
      <LetterApp freeSeats={s.free_seats} minMembers={s.min_members} />
    </Suspense>
  );
}
