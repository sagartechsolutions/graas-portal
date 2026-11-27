import type { Metadata } from "next";
import { Suspense } from "react";
import ApplyApp from "@/components/chapter/ApplyApp";
import FreshOnShow from "@/components/site/FreshOnShow";
import { getChapterSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Start a chapter", description: "Create a GRAAS chapter coordinator account for your college branch or your school." };

export default async function Page() {
  const s = await getChapterSettings();
  return (
    <Suspense fallback={<div className="shell py-16 text-ink2">Loading…</div>}>
      <FreshOnShow>
        <ApplyApp freeSeats={s.free_seats} minMembers={s.min_members} open={s.open} />
      </FreshOnShow>
    </Suspense>
  );
}
