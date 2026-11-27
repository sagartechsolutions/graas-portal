"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { browserClient, markActive, setOwnDevice } from "@/lib/browser";

export default function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Only pages on this site: a "next" link from elsewhere is ignored.
  const raw = params.get("next") ?? "";
  const next = /^\/(?!\/)[\w\-/?=&]*$/.test(raw) ? raw : "/account";
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    browserClient()
      .auth.getSession()
      .then(({ data }) => data.session && router.replace(next));
  }, [router, next]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setErr("");
    const { data, error } = await browserClient().auth.signInWithPassword({ email: String(f.get("email")).trim(), password: String(f.get("password")) });
    if (!error) {
      markActive();
      setOwnDevice(f.get("own_device") === "on" ? (data.user?.id ?? null) : null);
    }
    if (error) {
      setErr("That email and password do not match an account.");
      setBusy(false);
      return;
    }
    router.push(next);
  }

  return (
    <section className="bg-mist">
      <div className="mx-auto w-full max-w-md px-5 py-10 sm:py-16">
        <h1 className="h-section">Sign in</h1>
        <p className="mt-3 text-ink2">For GRAAS members, applicants and chapter coordinators. Chapter students: use the login from your GRAAS email.</p>
        {params.get("idle") && (
          <p role="status" className="mt-5 rounded-xl border border-[#f3d7a6] bg-[#fffaf0] px-4 py-3 text-[0.95rem] text-[#7a4b00]">
            You were signed out after 30 minutes without activity, to keep your account safe. Please sign in again.
          </p>
        )}
        <form onSubmit={submit} className="card mt-8 grid gap-4 p-6 shadow-[var(--shadow-card)] sm:p-8">
          <label className="grid gap-1.5 text-[0.95rem] font-medium">
            Email
            <input name="email" type="email" className="field" autoComplete="username" required />
          </label>
          <label className="grid gap-1.5 text-[0.95rem] font-medium">
            Password
            <input name="password" type="password" className="field" autoComplete="current-password" required />
          </label>
          <OwnDeviceBox />
          {err && (
            <p role="alert" className="rounded-xl border border-[#c2261a] bg-[#fff1ef] px-4 py-3 text-[0.95rem] font-medium text-[#8f1a11]">
              {err}
            </p>
          )}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <Link href="/forgot" className="justify-self-start text-[0.95rem] font-semibold underline decoration-go decoration-2 underline-offset-4">
            Forgot your password?
          </Link>
        </form>
        <p className="mt-6 text-ink2">
          Not a member yet?{" "}
          <Link href="/join" className="link">
            Become a member
          </Link>{" "}
          or{" "}
          <Link href="/chapters/apply" className="link">
            start a chapter
          </Link>
        </p>
      </div>
    </section>
  );
}

/** "This is my own device" on sign-in forms. Off by default: shared computers are signed out after 30 minutes idle. */
export function OwnDeviceBox({ dark = false }: { dark?: boolean }) {
  return (
    <label className={`flex items-start gap-3 rounded-xl p-3 text-[0.95rem] ${dark ? "bg-white/5" : "bg-mist"}`}>
      <input name="own_device" type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#02ae3e]" />
      <span>
        <span className="block font-semibold">This is my own device. Keep me signed in.</span>
        <span className="block text-sm text-ink2">Leave this off on shared or public computers: you will be signed out after 30 minutes without activity.</span>
      </span>
    </label>
  );
}
