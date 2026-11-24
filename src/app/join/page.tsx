import type { Metadata } from "next";
import { Suspense } from "react";
import JoinApp from "@/components/member/JoinApp";
import { getPlans, getProfileOptions } from "@/lib/data";

export const metadata: Metadata = { title: "Become a member", description: "Join the Global Robotics And Automation Society: choose a membership, create your account and pay online." };

export default async function Page() {
  const [plans, options] = await Promise.all([getPlans(), getProfileOptions()]);
  return (
    <Suspense fallback={<div className="shell py-16 text-ink2">Loading…</div>}>
      <JoinApp plans={plans} options={options} />
    </Suspense>
  );
}
