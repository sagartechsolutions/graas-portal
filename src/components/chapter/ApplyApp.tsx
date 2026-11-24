"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, CodeForm } from "@/components/member/Verify";
import Icon, { IconTile } from "@/components/ui/Icon";
import { browserClient, portal } from "@/lib/browser";

const lbl = "grid gap-1.5 text-[0.95rem] font-medium";

/** Step 1 of a chapter: the coordinator's own account. The chapter itself is set up in the console next. */
export default function ApplyApp({ freeSeats, minMembers, open }: { freeSeats: number; minMembers: number; open: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [kind, setKind] = useState<"college" | "school">(params.get("kind") === "school" ? "school" : "college");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ field?: string; error: string } | null>(null);
  const [verify, setVerify] = useState<{ email: string; sent: boolean } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    browserClient()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) router.replace(`/chapter?kind=${params.get("kind") === "school" ? "school" : "college"}`);
        else setChecking(false);
      });
  }, [router, params]);

  const bad = (f: string) => (err?.field === f ? { "aria-invalid": true as const } : {});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    setErr(null);
    if (v("password") !== v("password2")) return setErr({ field: "password2", error: "The two passwords do not match." });
    if (f.get("accept") !== "on") return setErr({ field: "accept", error: "Please accept the rules and policies to continue." });
    setBusy(true);
    const r = await portal("chapter_signup", {
      full_name: v("full_name"),
      email: v("email"),
      phone: v("phone"),
      designation: v("designation"),
      organisation: v("organisation"),
      city: v("city"),
      password: String(f.get("password") ?? ""),
      accept: true,
      website_hp: v("website"),
    });
    if (!r.ok) {
      setErr({ field: r.field, error: r.error ?? "Could not create the account." });
      return setBusy(false);
    }
    const s = await browserClient().auth.signInWithPassword({ email: v("email"), password: String(f.get("password") ?? "") });
    if (s.error) return router.push("/signin");
    if (r.verify === "email") {
      setVerify({ email: v("email").toLowerCase(), sent: r.sent !== false });
      setBusy(false);
      window.scrollTo({ top: 0 });
      return;
    }
    router.push(`/chapter?kind=${kind}`);
  }

  if (checking) return <div className="shell py-16 text-ink2">Loading…</div>;

  if (verify)
    return (
      <section className="bg-mist">
        <div className="mx-auto w-full max-w-xl px-5 py-10 sm:py-12">
          <p className="text-sm font-semibold text-go-deep">Coordinator account created</p>
          <h1 className="h-section mt-2">Check your email</h1>
          <p className="lede mt-3">
            We sent a 6-digit code to <strong className="break-all text-ink">{verify.email}</strong>. Type it below to confirm your email, then set up the chapter.
          </p>
          <div className="card mt-8 grid gap-5 p-6 shadow-[var(--shadow-card)] sm:p-8">
            {!verify.sent && <Alert tone="info">The first email could not be sent. Press Send a new code.</Alert>}
            <CodeForm purpose="verify_email" sent={verify.sent} submitLabel="Confirm email" onDone={() => router.push(`/chapter?kind=${kind}`)} />
          </div>
          <p className="mt-6 text-[0.95rem] text-ink2">
            You can also confirm later from the chapter console.{" "}
            <Link href={`/chapter?kind=${kind}`} className="font-semibold underline decoration-go decoration-2 underline-offset-4">
              Go to the chapter console
            </Link>
          </p>
        </div>
      </section>
    );

  return (
    <section className="bg-mist">
      <div className="shell grid gap-8 pb-12 pt-7 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,1fr)] lg:gap-10 lg:pb-16 lg:pt-10">
        <div>
          <p className="text-sm font-semibold text-go-deep">Step 1 of 3</p>
          <h1 className="h-display mt-1 !text-[clamp(2.2rem,1.5rem+3vw,3.6rem)]">Start a GRAAS chapter</h1>
          <p className="lede mt-4">
            First, your coordinator account. Next, in the chapter console, you add the chapter details, the principal&apos;s letter and the students. Already have an account?{" "}
            <Link href="/signin" className="font-semibold text-ink underline decoration-go decoration-2 underline-offset-4">
              Sign in
            </Link>{" "}
            and open the{" "}
            <Link href="/chapter" className="font-semibold text-ink underline decoration-go decoration-2 underline-offset-4">
              chapter console
            </Link>
            .
          </p>
          {!open && <div className="mt-6"><Alert tone="info">New chapter applications are paused for the moment. Write to connect@graas.org.in.</Alert></div>}
          <form onSubmit={submit} className="mt-7 grid gap-6" noValidate>
            <fieldset>
              <legend className="h-card">Which chapter?</legend>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(["college", "school"] as const).map((k) => {
                  const on = kind === k;
                  return (
                    <label key={k} className={`card relative flex cursor-pointer gap-4 p-5 transition-all ${on ? "!border-ink shadow-[var(--shadow-card)]" : "hover:border-slate3"}`}>
                      <input type="radio" name="kind" className="sr-only" checked={on} onChange={() => setKind(k)} />
                      <IconTile name={k === "college" ? "college" : "school"} tone={on ? "ink" : "mist"} />
                      <span>
                        <span className="block text-lg font-semibold">{k === "college" ? "College chapter" : "School chapter"}</span>
                        <span className="block text-sm text-ink2">{k === "college" ? `One branch, at least ${minMembers} students, ${freeSeats} free seats` : "Up to Class 12, every student free"}</span>
                      </span>
                      <span aria-hidden="true" className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 ${on ? "border-ink" : "border-slate3"}`}>{on && <span className="dot" />}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <fieldset className="card grid gap-4 p-5 shadow-[var(--shadow-card)] sm:p-8">
              <legend className="h-card float-left mb-2 w-full">About you, the coordinator</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={lbl}>
                  Full name
                  <input name="full_name" className="field" autoComplete="name" maxLength={80} required {...bad("full_name")} />
                </label>
                <label className={lbl}>
                  Designation
                  <input name="designation" className="field" maxLength={120} placeholder={kind === "college" ? "For example Assistant Professor, Mechanical" : "For example Science teacher"} required {...bad("designation")} />
                </label>
                <label className={`${lbl} sm:col-span-2`}>
                  {kind === "college" ? "College" : "School"}
                  <input name="organisation" className="field" autoComplete="organization" maxLength={120} required {...bad("organisation")} />
                </label>
                <label className={lbl}>
                  City
                  <input name="city" className="field" autoComplete="address-level2" maxLength={80} />
                </label>
                <label className={lbl}>
                  Mobile number (WhatsApp)
                  <input name="phone" className="field" type="tel" inputMode="numeric" maxLength={14} placeholder="10-digit number" required {...bad("phone")} />
                </label>
                <label className={`${lbl} sm:col-span-2`}>
                  Email
                  <input name="email" className="field" type="email" autoComplete="email" maxLength={160} required {...bad("email")} />
                  <span className="text-sm font-normal text-ink2">Your chapter login. An official college or school email is best.</span>
                </label>
                <label className={lbl}>
                  Password
                  <input name="password" className="field" type="password" autoComplete="new-password" minLength={8} maxLength={72} required {...bad("password")} />
                </label>
                <label className={lbl}>
                  Type it again
                  <input name="password2" className="field" type="password" autoComplete="new-password" maxLength={72} required {...bad("password2")} />
                </label>
              </div>
              <div className="hidden" aria-hidden="true">
                <label>
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
            </fieldset>
            <label className="flex items-start gap-3 text-[0.95rem]">
              <input type="checkbox" name="accept" className="mt-1 h-5 w-5 shrink-0 accent-[#067a2e]" {...bad("accept")} />
              <span>
                I will coordinate this chapter under the GRAAS{" "}
                <Link href="/policies/membership-rules" target="_blank" className="font-semibold underline decoration-go decoration-2 underline-offset-4">
                  membership rules
                </Link>
                ,{" "}
                <Link href="/policies/code-of-conduct" target="_blank" className="font-semibold underline decoration-go decoration-2 underline-offset-4">
                  code of conduct
                </Link>{" "}
                and{" "}
                <Link href="/policies/privacy" target="_blank" className="font-semibold underline decoration-go decoration-2 underline-offset-4">
                  privacy policy
                </Link>
                , and the student details I give will be correct.
              </span>
            </label>
            {err && (
              <p role="alert" className="rounded-xl border border-[#c2261a] bg-[#fff1ef] px-4 py-3 font-medium text-[#8f1a11]">
                {err.error}
              </p>
            )}
            <button type="submit" className="btn btn-primary justify-self-start" disabled={busy || !open}>
              {busy ? "Creating…" : "Create coordinator account"}
            </button>
          </form>
        </div>
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[24px] bg-ink p-6 text-white sm:p-8">
            <p className="text-sm font-medium text-white/60">Three steps</p>
            <ol className="mt-4 grid gap-4">
              {[
                ["Your account", "About two minutes."],
                ["Chapter details and the principal's letter", "Use our letter template."],
                [kind === "college" ? `At least ${minMembers} students` : "Your students", "From a form or our Excel sheet."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3.5">
                  <span className={`readout flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${i === 0 ? "bg-go text-white" : "bg-white/15"}`}>{i + 1}</span>
                  <span>
                    <span className="block font-semibold leading-tight">{t}</span>
                    <span className="text-sm text-white/65">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-6 border-t border-white/15 pt-5 text-sm text-white/70">GRAAS then checks the letter and the students, approves the chapter, and emails every student their own login.</p>
          </div>
          <div className="card mt-5 grid gap-3 p-6">
            <p className="font-semibold">Before you start</p>
            <a href={`/templates/graas-${kind}-chapter-principal-letter.docx`} download className="flex items-center gap-3 text-[0.95rem] font-medium hover:underline">
              <Icon name="letter" size={20} /> Principal&apos;s letter (Word)
            </a>
            <Link href={`/chapters/letter?kind=${kind}`} className="flex items-center gap-3 text-[0.95rem] font-medium hover:underline">
              <Icon name="certificate" size={20} /> Fill in the letter online
            </Link>
            <a href={`/templates/graas-${kind}-chapter-students.xlsx`} download className="flex items-center gap-3 text-[0.95rem] font-medium hover:underline">
              <Icon name="grid" size={20} /> Student list (Excel)
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}
