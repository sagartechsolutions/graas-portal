"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/browser";

export default function SignInForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    browserClient()
      .auth.getSession()
      .then(({ data }) => data.session && router.replace("/account"));
  }, [router]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setErr("");
    const { error } = await browserClient().auth.signInWithPassword({ email: String(f.get("email")).trim(), password: String(f.get("password")) });
    if (error) {
      setErr("That email and password do not match an account.");
      setBusy(false);
      return;
    }
    router.push("/account");
  }

  return (
    <section className="bg-mist">
      <div className="mx-auto w-full max-w-md px-5 py-16 sm:py-24">
        <h1 className="h-section">Sign in</h1>
        <p className="mt-3 text-ink2">For GRAAS members and applicants.</p>
        <form onSubmit={submit} className="card mt-8 grid gap-4 p-6 shadow-[var(--shadow-card)] sm:p-8">
          <label className="grid gap-1.5 text-[0.95rem] font-medium">
            Email
            <input name="email" type="email" className="field" autoComplete="username" required />
          </label>
          <label className="grid gap-1.5 text-[0.95rem] font-medium">
            Password
            <input name="password" type="password" className="field" autoComplete="current-password" required />
          </label>
          {err && (
            <p role="alert" className="rounded-xl border border-[#c2261a] bg-[#fff1ef] px-4 py-3 text-[0.95rem] font-medium text-[#8f1a11]">
              {err}
            </p>
          )}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-sm text-ink2">
            Forgot your password? Write to us from the{" "}
            <Link href="/contact" className="font-semibold underline decoration-go decoration-2 underline-offset-4">
              Contact page
            </Link>{" "}
            with your registered mobile number. After checking it is you, staff will set a temporary password.
          </p>
        </form>
        <p className="mt-6 text-ink2">
          Not a member yet?{" "}
          <Link href="/join" className="link">
            Become a member
          </Link>
        </p>
      </div>
    </section>
  );
}
