import type { Metadata } from "next";
import { Suspense } from "react";
import AccountApp from "@/components/member/AccountApp";
import { getPlans } from "@/lib/data";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

export default async function Page() {
  const plans = await getPlans();
  return (
    <Suspense fallback={<div className="shell py-24 text-ink2">Loading…</div>}>
      <AccountApp plans={plans} />
    </Suspense>
  );
}
