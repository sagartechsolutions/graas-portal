"use client";

import { normPhone } from "@/lib/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { browserClient, portal } from "@/lib/browser";
import { Alert, CodeInput, useCountdown } from "./Verify";

type Channels = { email: boolean; whatsapp: boolean };
const lbl = "grid gap-1.5 text-[0.95rem] font-medium";

export default function ForgotApp() {
  const router = useRouter();
  const [ch, setCh] = useState<Channels | null>(null);
  const [via, setVia] = useState<"email" | "whatsapp">("email");
  const [who, setWho] = useState("");
  const [step, setStep] = useState<"ask" | "reset" | "done">("ask");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ field?: string; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [left, setLeft] = useCountdown(0);

  useEffect(() => {
    browserClient()
      .rpc("messaging_channels")
      .then(({ data }) => setCh((data as Channels) ?? { email: false, whatsapp: false }));
  }, []);

  const body = () => (via === "email" ? { email: who.trim() } : { phone: normPhone(who) });

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null);
    setNote("");
    if (via === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(who.trim())) return setErr({ field: "who", text: "Enter the email address you signed up with." });
    if (via === "whatsapp" && !/^([6-9][0-9]{9}|[1-9][0-9]{10,14})$/.test(normPhone(who))) return setErr({ field: "who", text: "Enter your 10-digit mobile number." });
    setBusy(true);
    const r = await portal("send_code", { purpose: "reset_password", ...body() });
    setBusy(false);
    if (!r.ok) {
      setErr({ field: r.field === "email" ? "who" : undefined, text: r.error ?? "Could not send the code. Please try again." });
      if (r.wait) setLeft(Number(r.wait));
      return;
    }
    setSentTo(String(r.sent_to ?? who));
    setLeft(45);
    if (step === "reset") {
      setCode("");
      setNote("A new code is on its way. Codes sent earlier no longer work.");
    }
    setStep("reset");
  }

  async function reset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const p1 = String(f.get("password") ?? "");
    const p2 = String(f.get("password2") ?? "");
    setErr(null);
    setNote("");
    if (code.length !== 6) return setErr({ field: "code", text: "Enter the 6-digit code." });
    if (p1.length < 8) return setErr({ field: "password", text: "Choose a password of at least 8 characters." });
    if (p1 !== p2) return setErr({ field: "password2", text: "The two passwords do not match." });
    setBusy(true);
    const r = await portal("reset_password", { ...body(), code, password: p1 });
    if (!r.ok) {
      setBusy(false);
      return setErr({ field: r.field, text: r.error ?? "Could not change the password. Please try again." });
    }
    const sb = browserClient();
    const { error } = r.email ? await sb.auth.signInWithPassword({ email: String(r.email), password: p1 }) : { error: true };
    setStep("done");
    setBusy(false);
    if (!error) setTimeout(() => router.push("/account"), 1200);
  }

  const bad = (f: string) => (err?.field === f ? { "aria-invalid": true as const, "aria-describedby": "forgot-error" } : {});
  const none = ch && !ch.email && !ch.whatsapp;

  return (
    <section className="bg-mist">
      <div className="mx-auto w-full max-w-md px-5 py-10 sm:py-16">
        <h1 className="h-section">{step === "done" ? "Password changed" : "Reset your password"}</h1>

        {step === "done" ? (
          <div className="card mt-8 grid gap-4 p-6 shadow-[var(--shadow-card)] sm:p-8">
            <Alert tone="good">Your new password is saved. We have sent you a note that it changed.</Alert>
            <p className="text-ink2">Taking you to your account…</p>
            <Link href="/signin" className="btn btn-ghost justify-self-start">
              Sign in
            </Link>
          </div>
        ) : none ? (
          <div className="card mt-8 grid gap-4 p-6 shadow-[var(--shadow-card)] sm:p-8">
            <p>Resetting a password with a code is being set up.</p>
            <p className="text-ink2">
              Until then, write to us from the{" "}
              <Link href="/contact" className="font-semibold text-ink underline decoration-go decoration-2 underline-offset-4">
                Contact page
              </Link>{" "}
              with your registered mobile number. After checking it is you, we will set a temporary password.
            </p>
          </div>
        ) : step === "ask" ? (
          <>
            <p className="mt-3 text-ink2">We will send you a 6-digit code. Then you choose a new password.</p>
            <form onSubmit={send} className="card mt-8 grid gap-5 p-6 shadow-[var(--shadow-card)] sm:p-8" noValidate>
              {ch?.whatsapp && (
                <fieldset>
                  <legend className="text-[0.95rem] font-medium">Send the code by</legend>
                  <div className="mt-2 inline-flex rounded-full bg-mist p-1">
                    {(["email", "whatsapp"] as const).map((k) => (
                      <label key={k} className={`cursor-pointer rounded-full px-4 py-2 text-[0.95rem] font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-go-deep ${via === k ? "bg-ink text-white" : "text-ink2"}`}>
                        <input
                          type="radio"
                          name="via"
                          className="sr-only"
                          checked={via === k}
                          onChange={() => {
                            setVia(k);
                            setWho("");
                            setErr(null);
                          }}
                        />
                        {k === "email" ? "Email" : "WhatsApp"}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <label className={lbl}>
                {via === "email" ? "Your email address" : "Your mobile number"}
                {via === "email" ? (
                  <input className="field" type="email" autoComplete="username" value={who} onChange={(e) => setWho(e.target.value)} maxLength={160} {...bad("who")} />
                ) : (
                  <input className="field" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit number" value={who} onChange={(e) => setWho(e.target.value)} maxLength={14} {...bad("who")} />
                )}
                {via === "whatsapp" && <span className="text-sm font-normal text-ink2">Works if you confirmed this number on WhatsApp in your account.</span>}
              </label>
              {err && (
                <span id="forgot-error">
                  <Alert tone="bad">{err.text}</Alert>
                </span>
              )}
              <button className="btn btn-primary justify-self-start" disabled={busy || !ch || left > 0}>
                {busy ? "Sending…" : left > 0 ? `Wait ${left}s` : "Send code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-3 text-ink2">
              If an account matches, a code is on its way to <strong className="break-all text-ink">{sentTo}</strong>
              {via === "email" ? ". Look in Spam or Promotions if it is not in your inbox." : " on WhatsApp."} It works for 10 minutes.
            </p>
            <form onSubmit={reset} className="card mt-8 grid gap-4 p-6 shadow-[var(--shadow-card)] sm:p-8" noValidate>
              <label className={lbl}>
                6-digit code
                <CodeInput value={code} onChange={setCode} invalid={err?.field === "code"} autoFocus describedBy={err?.field === "code" ? "forgot-error" : undefined} />
              </label>
              <label className={lbl}>
                New password
                <input name="password" type="password" className="field" autoComplete="new-password" minLength={8} maxLength={72} {...bad("password")} />
                <span className="text-sm font-normal text-ink2">At least 8 characters.</span>
              </label>
              <label className={lbl}>
                Type it again
                <input name="password2" type="password" className="field" autoComplete="new-password" maxLength={72} {...bad("password2")} />
              </label>
              {err && (
                <span id="forgot-error">
                  <Alert tone="bad">{err.text}</Alert>
                </span>
              )}
              {note && <Alert tone="good">{note}</Alert>}
              <div className="flex flex-wrap items-center gap-3">
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? "Saving…" : "Set new password"}
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => send()} disabled={left > 0 || busy}>
                  {left > 0 ? `Send a new code in ${left}s` : "Send a new code"}
                </button>
              </div>
              <button
                type="button"
                className="link justify-self-start text-[0.95rem]"
                onClick={() => {
                  setStep("ask");
                  setCode("");
                  setErr(null);
                  setNote("");
                }}
              >
                Use a different {via === "email" ? "email" : "number"}
              </button>
            </form>
          </>
        )}

        {step !== "done" && (
          <p className="mt-6 text-ink2">
            Remembered it?{" "}
            <Link href="/signin" className="link">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
