"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/browser";

/** Signed-in members go straight to the post in their account; others sign in first and come back to it. */
export default function ApplyCta({ refNo, open }: { refNo: string; open: boolean }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    browserClient()
      .auth.getSession()
      .then(({ data }) => setSignedIn(!!data.session));
  }, []);
  const target = `/account?tab=opportunities&opp=${refNo}`;
  if (!open) return <p className="rounded-xl bg-mist px-4 py-3 font-semibold">Applications are closed.</p>;
  return (
    <div className="grid gap-3">
      <Link href={signedIn ? target : `/signin?next=${encodeURIComponent(target)}`} className="btn btn-primary">
        {signedIn ? "Apply with my GRAAS profile" : "Sign in to apply"}
      </Link>
      {!signedIn && (
        <Link href="/join" className="btn btn-ghost">
          Not a member? Join GRAAS
        </Link>
      )}
      <p className="text-sm text-ink2">Applying is for GRAAS members. Your mobile number and email stay hidden until the company accepts you.</p>
    </div>
  );
}
