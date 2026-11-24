import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyApp from "@/components/member/VerifyApp";

export const metadata: Metadata = { title: "Verify a member", description: "Check a GRAAS member number." };

export default function Page() {
  return (
    <Suspense fallback={<div className="shell py-24 text-ink2">Loading…</div>}>
      <VerifyApp />
    </Suspense>
  );
}
