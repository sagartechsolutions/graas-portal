"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/browser";

/** Signed-in people go to the event in their account to register (and pay if needed); others sign in first. */
export default function RegisterCta({ refNo, open }: { refNo: string; open: boolean }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    browserClient()
      .auth.getSession()
      .then(({ data }) => setSignedIn(!!data.session));
  }, []);
  const target = `/account?tab=events&event=${refNo}`;
  if (!open) return <p className="rounded-xl bg-mist px-4 py-3 font-semibold">Registration is closed.</p>;
  return (
    <div className="grid gap-3">
      <Link href={signedIn ? target : `/signin?next=${encodeURIComponent(target)}`} className="btn btn-primary">
        {signedIn ? "Register" : "Sign in to register"}
      </Link>
      {!signedIn && (
        <Link href="/join" className="btn btn-ghost">
          Join GRAAS for member prices
        </Link>
      )}
    </div>
  );
}
