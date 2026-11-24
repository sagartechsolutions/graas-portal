"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { browserClient, portal } from "@/lib/browser";
import { INDIAN_STATES, inr } from "@/lib/money";
import type { Plan } from "@/lib/site";
import { GuardianFields, ORG_LABEL, PersonFields, ROLE_HINT, ROLE_LABEL, isMinor, type ProfileOptions } from "./Details";
import { Alert, CodeForm } from "./Verify";
const term = (m: number | null) => (m === null ? "one time" : m === 12 ? "per year" : m % 12 === 0 ? `for ${m / 12} years` : `for ${m} months`);

export function planFee(p: Plan) {
  if (p.price_inr === null) return "Fee to be announced";
  if (Number(p.price_inr) === 0) return "No fee";
  return `${inr(Math.round(Number(p.price_inr) * 100))} ${term(p.duration_months)}${p.gst_percent > 0 ? ` + ${p.gst_percent}% GST` : ""}`;
}

export default function JoinApp({ plans, options }: { plans: Plan[]; options: ProfileOptions }) {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState(() => (plans.some((p) => p.code === params.get("plan")) ? params.get("plan")! : (plans[0]?.code ?? "")));
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ field?: string; error: string } | null>(null);
  const [verify, setVerify] = useState<{ email: string; sent: boolean } | null>(null);
  const [dob, setDob] = useState("");
  const plan = useMemo(() => plans.find((p) => p.code === code) ?? plans[0], [plans, code]);
  const individual = plan?.audience === "student" || plan?.audience === "professional";

  useEffect(() => {
    const sb = browserClient();
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) return setSignedIn(false);
      const acct = (await sb.rpc("my_account")).data as { membership: { status: string } | null } | null;
      if (acct?.membership && ["pending_approval", "pending_payment", "active", "suspended"].includes(acct.membership.status)) router.replace("/account");
      else setSignedIn(true);
    });
  }, [router]);

  const bad = (f: string) => (err?.field === f ? { "aria-invalid": true as const, "aria-describedby": "join-error" } : {});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    setErr(null);
    if (f.get("accept") !== "on") return setErr({ field: "accept", error: "Please accept the membership rules and policies to continue." });
    setBusy(true);
    const sb = browserClient();
    const details = { gender: v("gender"), course: v("course"), branch: v("branch"), study_year: v("study_year"), designation: v("designation") };
    if (signedIn) {
      const { data } = await sb.rpc("member_apply", { p_plan_code: code, p_org: v("organisation"), p_details: details });
      if (data?.ok) return router.push("/account?welcome=1");
      setErr({ field: data?.field, error: data?.error ?? "Could not save the application. Please try again." });
      return setBusy(false);
    }
    if (v("password") !== v("password2")) {
      setErr({ field: "password2", error: "The two passwords do not match." });
      return setBusy(false);
    }
    const res = await portal("signup", {
      plan_code: code,
      full_name: v("full_name"),
      email: v("email"),
      phone: v("phone"),
      dob: v("dob"),
      city: v("city"),
      state: v("state"),
      organisation: v("organisation"),
      website: v("org_website"),
      ...details,
      guardian_name: v("guardian_name"),
      guardian_phone: v("guardian_phone"),
      guardian_agree: f.get("guardian_agree") === "on",
      password: String(f.get("password") ?? ""),
      ref: params.get("ref") ?? "",
      accept: true,
      website_hp: v("website"),
    });
    if (!res.ok) {
      setErr({ field: res.field, error: res.error ?? "Could not create the account. Please try again." });
      return setBusy(false);
    }
    const { error } = await sb.auth.signInWithPassword({ email: v("email"), password: String(f.get("password") ?? "") });
    if (error) return router.push("/signin");
    if (res.verify === "email") {
      setVerify({ email: v("email").toLowerCase(), sent: res.sent !== false });
      setBusy(false);
      window.scrollTo({ top: 0 });
      return;
    }
    router.push("/account?welcome=1");
  }

  const lbl = "grid gap-1.5 text-[0.95rem] font-medium";
  if (plans.length === 0)
    return (
      <section className="shell py-16">
        <h1 className="h-section">Membership plans are being prepared.</h1>
        <p className="lede mt-4">Please check back shortly.</p>
      </section>
    );

  if (verify)
    return (
      <section className="bg-mist">
        <div className="mx-auto w-full max-w-xl px-5 py-10 sm:py-12">
          <p className="text-sm font-semibold text-go-deep">Account created, application saved</p>
          <h1 className="h-section mt-2">Check your email</h1>
          <p className="lede mt-3">
            We sent a 6-digit code to <strong className="break-all text-ink">{verify.email}</strong>. Type it below to confirm your email address. If it is not in your inbox, look in Spam or Promotions.
          </p>
          <div className="card mt-8 grid gap-5 p-6 shadow-[var(--shadow-card)] sm:p-8">
            {!verify.sent && <Alert tone="info">The first email could not be sent. Press Send a new code.</Alert>}
            <CodeForm purpose="verify_email" sent={verify.sent} submitLabel="Confirm email" onDone={() => router.push("/account?welcome=1")} />
          </div>
          <p className="mt-6 text-[0.95rem] text-ink2">
            Typed the wrong email?{" "}
            <Link href="/account" className="font-semibold underline decoration-go decoration-2 underline-offset-4">
              Go to your account
            </Link>{" "}
            and change it under Profile. You can also confirm later, but you need a confirmed email before paying.
          </p>
        </div>
      </section>
    );

  return (
    <section className="bg-mist">
      <div className="shell grid gap-7 pb-12 pt-7 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)] lg:gap-10 lg:pb-16 lg:pt-10">
        <div>
          <h1 className="h-display !text-[clamp(2.3rem,1.5rem+3.2vw,3.8rem)]">Become a member</h1>
          <p className="lede mt-4">
            Choose your membership, tell us who you are, and create your account. Already have an account?{" "}
            <Link href="/signin" className="font-semibold text-ink underline decoration-go decoration-2 underline-offset-4">
              Sign in
            </Link>
          </p>

          <form onSubmit={submit} className="mt-7 grid gap-8" noValidate>
            <fieldset>
              <legend className="h-card">1. Choose your membership</legend>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {plans.map((p) => {
                  const on = p.code === code;
                  return (
                    <label key={p.code} className={`card relative cursor-pointer p-5 transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-go-deep ${on ? "!border-ink shadow-[var(--shadow-card)]" : "hover:border-slate3"}`}>
                      <input type="radio" name="plan" className="sr-only" checked={on} onChange={() => setCode(p.code)} />
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-lg font-semibold">{p.name}</span>
                        <span aria-hidden="true" className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-ink" : "border-slate3"}`}>
                          {on && <span className="dot" />}
                        </span>
                      </span>
                      {p.tagline && <span className="mt-1 block text-sm text-ink2">{p.tagline}</span>}
                      <span className="mt-3 block text-[0.95rem] font-semibold">{planFee(p)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="card grid gap-4 p-5 shadow-[var(--shadow-card)] sm:p-8">
              <legend className="h-card float-left mb-2 w-full">2. {signedIn ? "Your organisation" : "Your details"}</legend>
              {!signedIn && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={lbl}>
                    {individual ? "Full name" : "Your full name"}
                    <input name="full_name" className="field" autoComplete="name" maxLength={80} required {...bad("full_name")} />
                  </label>
                  <label className={lbl}>
                    Mobile number (WhatsApp)
                    <input name="phone" className="field" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit number" maxLength={14} required {...bad("phone")} />
                  </label>
                  <label className={lbl}>
                    Email
                    <input name="email" className="field" type="email" autoComplete="email" maxLength={160} required {...bad("email")} />
                  </label>
                  {individual && (
                    <label className={lbl}>
                      Date of birth
                      <input name="dob" className="field" type="date" autoComplete="bday" required value={dob} onChange={(e) => setDob(e.target.value)} {...bad("dob")} />
                    </label>
                  )}
                  <label className={lbl}>
                    City
                    <input name="city" className="field" autoComplete="address-level2" maxLength={80} required {...bad("city")} />
                  </label>
                  <label className={lbl}>
                    State
                    <select name="state" className="field" defaultValue="Maharashtra" autoComplete="address-level1">
                      {INDIAN_STATES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                      <option value="Outside India">Outside India</option>
                    </select>
                  </label>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={lbl}>
                  {ORG_LABEL[plan.audience]}
                  <input name="organisation" className="field" autoComplete="organization" maxLength={120} required {...bad("organisation")} />
                </label>
                {ROLE_LABEL[plan.audience] && (
                  <label className={lbl}>
                    {ROLE_LABEL[plan.audience]}
                    <input name="designation" className="field" maxLength={120} placeholder={ROLE_HINT[plan.audience]} />
                  </label>
                )}
                <PersonFields key={plan.audience} audience={plan.audience} options={options} bad={bad} lbl={lbl} />
                {!signedIn && individual && isMinor(dob) && <GuardianFields bad={bad} lbl={lbl} withAgree />}
                {!signedIn && !individual && (
                  <label className={`${lbl} sm:col-span-2`}>
                    <span>
                      Website <span className="font-normal text-ink2">(optional)</span>
                    </span>
                    <input name="org_website" className="field" type="url" maxLength={160} placeholder="https://" />
                  </label>
                )}
              </div>
              {plan.requires_approval && <p className="rounded-xl bg-mist px-4 py-3 text-[0.95rem] text-ink2">GRAAS verifies institution and industry applications before asking for payment. You will see the status in your account.</p>}
            </fieldset>

            {!signedIn && (
              <fieldset className="card grid gap-4 p-5 shadow-[var(--shadow-card)] sm:p-8">
                <legend className="h-card float-left mb-2 w-full">3. Create your password</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={lbl}>
                    Password
                    <input name="password" className="field" type="password" autoComplete="new-password" minLength={8} maxLength={72} required {...bad("password")} />
                    <span className="text-sm font-normal text-ink2">At least 8 characters. You sign in with your email and this password.</span>
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
            )}

            <div className="grid gap-4">
              <label className="flex items-start gap-3 text-[0.95rem]">
                <input type="checkbox" name="accept" className="mt-1 h-5 w-5 shrink-0 accent-[#067a2e]" {...bad("accept")} />
                <span>
                  The details above are true, and I accept the{" "}
                  {[
                    ["membership-rules", "Membership rules"],
                    ["code-of-conduct", "Code of conduct"],
                    ["refund-policy", "Refund policy"],
                    ["terms", "Terms of use"],
                    ["privacy", "Privacy policy"],
                  ].map(([slug, name], i, a) => (
                    <span key={slug}>
                      <Link href={`/policies/${slug}`} target="_blank" className="font-semibold underline decoration-go decoration-2 underline-offset-4">
                        {name}
                      </Link>
                      {i < a.length - 2 ? ", " : i === a.length - 2 ? " and " : "."}
                    </span>
                  ))}{" "}
                  GRAAS may contact me about my membership by WhatsApp, phone or email.
                </span>
              </label>
              {err && (
                <p id="join-error" role="alert" className="rounded-xl border border-[#c2261a] bg-[#fff1ef] px-4 py-3 font-medium text-[#8f1a11]">
                  {err.error}
                </p>
              )}
              <button type="submit" className="btn btn-primary justify-self-start" disabled={busy || signedIn === null}>
                {busy ? "Saving…" : signedIn ? "Apply for membership" : "Create account and apply"}
              </button>
            </div>
          </form>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[24px] bg-ink p-6 text-white sm:p-8">
            <p className="text-sm font-medium text-white/60">You are applying for</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{plan.name} membership</p>
            <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">{planFee(plan)}</p>
            <ul className="mt-6 grid gap-2.5 text-[0.95rem] text-white/85">
              {plan.benefits.map((b) => (
                <li key={b} className="flex gap-2.5">
                  <span aria-hidden="true" className="dot mt-[0.55em]" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <ol className="card mt-5 grid gap-4 p-6">
            {[
              ["Create your account", "Your application is saved at once."],
              plan.requires_approval ? ["GRAAS verifies it", "Usually within a few working days."] : null,
              plan.price_inr === null ? ["Pay when the fee is announced", "We will message you. Nothing is charged today."] : Number(plan.price_inr) === 0 ? null : ["Pay online", plan.duration_months === 12 ? "Choose 1 year or pay once for longer and save. Securely through Razorpay." : "Securely through Razorpay: UPI, cards or net banking."],
              ["Membership is active", "Member number, digital ID and certificate in your account."],
            ]
              .filter((x): x is string[] => x !== null)
              .map(([t, d], i) => (
                <li key={t} className="flex gap-3.5">
                  <span className="readout flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs text-white">{i + 1}</span>
                  <span>
                    <span className="block font-semibold leading-tight">{t}</span>
                    <span className="text-sm text-ink2">{d}</span>
                  </span>
                </li>
              ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}
