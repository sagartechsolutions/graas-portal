import type { Metadata } from "next";
import { Suspense } from "react";
import SignInForm from "@/components/member/SignInForm";
import FreshOnShow from "@/components/site/FreshOnShow";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to your GRAAS member account." };

export default function Page() {
  return (
    <Suspense fallback={<div className="shell py-16 text-ink2">Loading…</div>}>
      <FreshOnShow>
        <SignInForm />
      </FreshOnShow>
    </Suspense>
  );
}
