"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Logo, { LogoMark } from "@/components/site/Logo";
import { browserClient, portal } from "@/lib/browser";
import { INDIAN_STATES, STATUS_LABEL, effectiveStatus, inr, shortDate } from "@/lib/money";
import { ORG, type Plan } from "@/lib/site";
import { planFee } from "./JoinApp";
import Qr from "./Qr";

type Account = { profile: any; membership: any | null; orders: any[]; tickets: any[]; referrals: number; pay_online: boolean; is_staff: boolean; today: string };
const sb = () => browserClient();
const lbl = "grid gap-1.5 text-[0.95rem] font-medium";
const AUD: Record<string, string> = { student: "Student member", professional: "Professional member", institution: "Institution member", industry: "Industry member" };

function loadRazorpay(): Promise<boolean> {
  return new Promise((res) => {
    if ((window as any).Razorpay) return res(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => res(true);
    s.onerror = () => res(false);
    document.body.appendChild(s);
  });
}

function Notice({ tone = "info", children }: { tone?: "info" | "good" | "warn" | "bad"; children: React.ReactNode }) {
  const cls = { info: "bg-mist text-ink", good: "bg-go-soft text-go-deep", warn: "bg-[#fff4e5] text-[#8a4b00]", bad: "bg-[#fff1ef] text-[#8f1a11]" }[tone];
  return <p className={`rounded-xl px-4 py-3 text-[0.95rem] font-medium ${cls}`}>{children}</p>;
}

function Steps({ m, state }: { m: any; state: string }) {
  const steps = ["Applied", ...(m.plan.requires_approval ? ["Verified"] : []), "Fee paid", "Active"];
  const done = state === "active" || state === "expired" || state === "suspended" ? steps.length : state === "pending_payment" ? steps.length - 2 : 1;
  return (
    <ol className="flex flex-wrap gap-x-2 gap-y-3">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${i < done ? "bg-ink text-white" : "border border-line bg-white text-ink2"}`}>
            {i < done ? (
              <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M2.5 7.5 5.8 10.5 11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              i + 1
            )}
          </span>
          <span className={`text-[0.95rem] font-medium ${i < done ? "" : "text-ink2"}`}>{s}</span>
          {i < steps.length - 1 && <span aria-hidden="true" className="mx-1 h-px w-6 bg-line sm:w-10" />}
        </li>
      ))}
    </ol>
  );
}

/* Fee, coupon and the Razorpay checkout. Used for a first payment and for renewal. */
function PayPanel({ a, renewal, onChange }: { a: Account; renewal: boolean; onChange: (msg?: string) => void }) {
  const m = a.membership;
  const [quote, setQuote] = useState<any>(m.quote);
  const [coupon, setCoupon] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function applyCoupon() {
    const { data } = await sb().rpc("quote_plan", { p_plan_code: m.plan.code, p_coupon: coupon });
    if (data) setQuote(data);
  }
  async function pay() {
    setBusy(true);
    setMsg("");
    const o = await portal("create_order", { coupon: quote?.coupon ?? "" });
    if (!o.ok) {
      setMsg(o.error ?? "Could not start the payment.");
      return setBusy(false);
    }
    if (o.free) return onChange("Your membership is active.");
    if (!(await loadRazorpay())) {
      setMsg("The payment window could not load. Check your internet and try again.");
      return setBusy(false);
    }
    const rz = new (window as any).Razorpay({
      key: o.key_id,
      order_id: o.rzp_order_id,
      amount: o.amount,
      currency: "INR",
      name: "GRAAS",
      description: `${o.description} membership`,
      prefill: o.prefill,
      theme: { color: "#000e21" },
      modal: { ondismiss: () => setBusy(false) },
      handler: async (r: any) => {
        setMsg("Confirming your payment…");
        const v = await portal("verify_payment", { rzp_order_id: r.razorpay_order_id, rzp_payment_id: r.razorpay_payment_id, signature: r.razorpay_signature });
        setBusy(false);
        onChange(v.ok ? "Payment received. Your membership is active." : v.error);
      },
    });
    rz.on("payment.failed", () => setMsg("The payment did not go through. Nothing was charged, or it will be reversed by your bank. You can try again."));
    rz.open();
  }

  if (quote?.fee_pending) return <Notice tone="warn">The fee for this membership has not been announced yet. Your application is saved; we will message you when payment opens, and you can pay here.</Notice>;
  if (!quote?.ok) return <Notice tone="bad">{quote?.error ?? "The fee could not be worked out."}</Notice>;
  const row = "flex items-baseline justify-between gap-4 py-2";
  return (
    <div className="grid gap-4">
      <dl className="rounded-2xl bg-mist px-5 py-3">
        <div className={row}>
          <dt>
            {quote.plan_name} membership{renewal ? ", renewal" : ""}
          </dt>
          <dd className="readout">{inr(quote.base_paise)}</dd>
        </div>
        {quote.discount_paise > 0 && (
          <div className={row}>
            <dt>Discount ({quote.coupon})</dt>
            <dd className="readout">− {inr(quote.discount_paise)}</dd>
          </div>
        )}
        {quote.gst_paise > 0 && (
          <div className={row}>
            <dt>GST at {Number(quote.gst_percent)}%</dt>
            <dd className="readout">{inr(quote.gst_paise)}</dd>
          </div>
        )}
        <div className={`${row} border-t border-line text-lg font-semibold`}>
          <dt>To pay</dt>
          <dd className="readout">{inr(quote.total_paise)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-end gap-3">
        <label className={`${lbl} w-44`}>
          Coupon code
          <input className="field readout uppercase" value={coupon} maxLength={20} onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
        </label>
        <button type="button" className="btn btn-ghost" onClick={applyCoupon} disabled={!coupon.trim()}>
          Apply code
        </button>
        {quote.coupon_note && <p className="w-full text-sm font-medium text-[#8f1a11]">{quote.coupon_note}</p>}
      </div>
      {quote.total_paise > 0 && !a.pay_online ? (
        <Notice tone="warn">Online payment opens shortly. Your application is saved, and you will be able to pay here.</Notice>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" className="btn btn-primary" onClick={pay} disabled={busy}>
            {busy ? "Opening payment…" : quote.total_paise === 0 ? "Activate membership" : `Pay ${inr(quote.total_paise)}`}
          </button>
          {quote.total_paise > 0 && <p className="text-sm text-ink2">Secure payment by Razorpay: UPI, cards, net banking.</p>}
        </div>
      )}
      {msg && <Notice tone="warn">{msg}</Notice>}
    </div>
  );
}

function IdCard({ a }: { a: Account }) {
  const m = a.membership, p = a.profile;
  const url = `${window.location.origin}/verify?id=${m.member_no}`;
  return (
    <div className="print-area @container relative aspect-[1.586] w-full max-w-[460px] overflow-hidden rounded-[22px] bg-ink text-white shadow-[var(--shadow-lift)]">
      <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(420px circle at 80% 0%, rgba(255,255,255,0.16), transparent 60%)" }} />
      <LogoMark size={250} tone="light" className="absolute -bottom-10 -right-8 opacity-[0.06]" />
      <div className="relative flex h-full flex-col justify-between p-[6.5%]">
        <div className="flex items-start justify-between gap-2">
          <span className="origin-top-left @max-sm:scale-[0.72]">
            <Logo tone="light" />
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium @max-sm:px-2 @max-sm:text-[0.62rem]">
            <span className="dot" /> {AUD[m.plan.audience]}
          </span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold leading-tight tracking-tight @max-sm:text-base sm:text-2xl">{p.full_name}</p>
            <p className="truncate text-sm text-white/65 @max-sm:text-xs">{m.organisation ?? p.organisation}</p>
            <p className="readout mt-3 text-[0.7rem] text-white/50 @max-sm:hidden">Member number</p>
            <p className="readout whitespace-nowrap text-base @max-sm:mt-1.5 @max-sm:text-[0.8rem]">{m.member_no}</p>
            <p className="mt-1 text-xs text-white/60 @max-sm:text-[0.65rem]">{m.ends_on ? `Valid until ${shortDate(m.ends_on)}` : "No end date"}</p>
          </div>
          <div className="shrink-0 rounded-xl bg-white p-1.5 @max-sm:rounded-lg @max-sm:p-1">
            <Qr value={url} size={84} className="@max-sm:h-[58px] @max-sm:w-[58px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Certificate({ a }: { a: Account }) {
  const m = a.membership, p = a.profile;
  const url = `${window.location.origin}/verify?id=${m.member_no}`;
  const org = m.plan.audience === "institution" || m.plan.audience === "industry";
  return (
    <div className="print-area mx-auto w-full max-w-4xl rounded-[18px] border border-line bg-white p-3 shadow-[var(--shadow-card)]">
      <div className="relative overflow-hidden rounded-[12px] border-2 border-ink px-6 py-10 text-center sm:px-14 sm:py-14">
        <LogoMark size={420} className="pointer-events-none absolute -bottom-10 -right-16 opacity-[0.05]" />
        <div className="relative">
          <div className="flex justify-center">
            <LogoMark size={74} />
          </div>
          <p className="mt-4 text-sm font-semibold tracking-wide text-ink2">{ORG.name}</p>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-5xl">Certificate of membership</h2>
          <p className="mt-8 text-ink2">This is to certify that</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">{org ? (m.organisation ?? p.organisation) : p.full_name}</p>
          {org && <p className="mt-1 text-ink2">represented by {p.full_name}</p>}
          <p className="mx-auto mt-5 max-w-xl text-ink2">
            is a <strong className="font-semibold text-ink">{m.plan.name} member</strong> of the {ORG.name}
            {m.ends_on ? `, for the period ${shortDate(m.starts_on)} to ${shortDate(m.ends_on)}.` : `, from ${shortDate(m.starts_on)}.`}
          </p>
          <div className="mt-10 flex flex-wrap items-end justify-between gap-6 text-left">
            <div>
              <p className="text-sm text-ink2">Member number</p>
              <p className="readout text-lg font-medium">{m.member_no}</p>
              <p className="mt-3 text-sm text-ink2">Issued on</p>
              <p className="font-medium">{shortDate(m.activated_at)}</p>
            </div>
            <div className="flex items-end gap-3">
              <p className="max-w-[11rem] text-right text-xs text-ink2">Issued digitally. Scan to check that this membership is current.</p>
              <Qr value={url} size={92} className="rounded-md border border-line" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Receipt({ o, org }: { o: any; org: any }) {
  const row = "flex justify-between gap-6 py-1.5";
  return (
    <div className="print-area mx-auto w-full max-w-2xl rounded-[18px] border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <Logo full />
          {org?.address && <p className="mt-3 max-w-xs text-sm text-ink2">{org.address}</p>}
          {(org?.email || org?.phone) && <p className="text-sm text-ink2">{[org.email, org.phone].filter(Boolean).join(", ")}</p>}
          {org?.gstin && <p className="text-sm text-ink2">GSTIN {org.gstin}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tracking-tight">Receipt</p>
          <p className="readout mt-1 text-sm">{o.receipt_no}</p>
          <p className="text-sm text-ink2">{shortDate(o.paid_at)}</p>
        </div>
      </div>
      <div className="grid gap-1 border-b border-line py-5 text-[0.95rem]">
        <p className="text-sm text-ink2">Received from</p>
        <p className="font-semibold">{o.payer_name}</p>
        <p className="text-ink2">{[o.payer_email, o.payer_phone].filter(Boolean).join(", ")}</p>
      </div>
      <dl className="py-5 text-[0.95rem]">
        <div className={row}>
          <dt>
            {o.plan_name} membership ({o.kind === "renewal" ? "renewal" : "new"})
          </dt>
          <dd className="readout">{inr(o.base_paise)}</dd>
        </div>
        {o.discount_paise > 0 && (
          <div className={row}>
            <dt>Discount{o.coupon_code ? ` (${o.coupon_code})` : ""}</dt>
            <dd className="readout">− {inr(o.discount_paise)}</dd>
          </div>
        )}
        {o.gst_paise > 0 && (
          <div className={row}>
            <dt>GST at {Number(o.gst_percent)}%</dt>
            <dd className="readout">{inr(o.gst_paise)}</dd>
          </div>
        )}
        <div className={`${row} mt-2 border-t border-line pt-3 text-lg font-semibold`}>
          <dt>Total received</dt>
          <dd className="readout">{inr(o.total_paise)}</dd>
        </div>
        {o.refunded_paise > 0 && (
          <div className={row}>
            <dt>Refunded</dt>
            <dd className="readout">− {inr(o.refunded_paise)}</dd>
          </div>
        )}
      </dl>
      <p className="text-sm text-ink2">
        Paid online through Razorpay{o.method ? ` (${o.method})` : ""}. Payment reference <span className="readout">{o.rzp_payment_id ?? "none"}</span>. This is a computer-generated receipt and needs no signature.
      </p>
    </div>
  );
}

function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
      {label}
    </button>
  );
}

function Overview({ a, plans, state, reload }: { a: Account; plans: Plan[]; state: string; reload: (msg?: string) => void }) {
  const m = a.membership;
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState("");
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const invite = `${origin}/join?ref=${a.profile.referral_code ?? ""}`;
  const renewable = m && m.status === "active" && m.ends_on && (new Date(m.ends_on).getTime() - new Date(a.today).getTime()) / 86400000 <= 60;

  async function act(fn: string, args: Record<string, unknown> = {}) {
    setErr("");
    const { data } = await sb().rpc(fn, args);
    if (data?.ok) reload();
    else setErr(data?.error ?? "That did not work. Please try again.");
  }

  if (!m || state === "rejected" || state === "cancelled")
    return (
      <div className="card grid gap-4 p-6 sm:p-8">
        <h2 className="h-card !text-2xl">{m ? (state === "rejected" ? "Your application was not approved" : "Your earlier application is closed") : "You do not have a membership yet"}</h2>
        {m?.decision_reason && <Notice tone="warn">Reason given: {m.decision_reason}</Notice>}
        <p className="text-ink2">Choose a membership to apply{m ? " again" : ""}. Your account details are already saved.</p>
        <p>
          <Link href="/join" className="btn btn-primary">
            Choose a membership
          </Link>
        </p>
      </div>
    );

  return (
    <div className="grid gap-5">
      <div className="card grid gap-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-ink2">Your membership</p>
            <h2 className="h-card !text-2xl">{m.plan.name}</h2>
            <p className="text-ink2">{planFee(m.plan)}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${state === "active" ? "bg-go-soft text-go-deep" : state === "suspended" || state === "expired" ? "bg-[#fff1ef] text-[#8f1a11]" : "bg-[#fff4e5] text-[#8a4b00]"}`}>{STATUS_LABEL[state]}</span>
        </div>
        <Steps m={m} state={state} />

        {state === "pending_approval" && <Notice>GRAAS is verifying your application. This usually takes a few working days. When it is verified, you will be able to pay here.</Notice>}
        {state === "pending_payment" && <PayPanel a={a} renewal={false} onChange={reload} />}
        {state === "suspended" && <Notice tone="bad">This membership is suspended.{m.decision_reason ? ` Reason given: ${m.decision_reason}` : ""} You can reply from the Help tab.</Notice>}
        {state === "expired" && (
          <>
            <Notice tone="warn">Your membership ended on {shortDate(m.ends_on)}. Renew to keep your member number {m.member_no}.</Notice>
            <PayPanel a={a} renewal onChange={reload} />
          </>
        )}
        {state === "active" && (
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-mist p-4">
              <dt className="text-sm text-ink2">Member number</dt>
              <dd className="readout mt-1 text-lg font-medium">{m.member_no}</dd>
            </div>
            <div className="rounded-2xl bg-mist p-4">
              <dt className="text-sm text-ink2">Member since</dt>
              <dd className="mt-1 text-lg font-medium">{shortDate(m.starts_on)}</dd>
            </div>
            <div className="rounded-2xl bg-mist p-4">
              <dt className="text-sm text-ink2">Valid until</dt>
              <dd className="mt-1 text-lg font-medium">{m.ends_on ? shortDate(m.ends_on) : "No end date"}</dd>
            </div>
          </dl>
        )}
        {state === "active" && renewable && (
          <div className="grid gap-3 border-t border-line pt-6">
            <h3 className="h-card">Renew your membership</h3>
            <p className="text-ink2">Renewing now adds a full period after {shortDate(m.ends_on)}. You lose no days.</p>
            <PayPanel a={a} renewal onChange={reload} />
          </div>
        )}

        {(state === "pending_approval" || state === "pending_payment") && (
          <div className="flex flex-wrap items-end gap-3 border-t border-line pt-5">
            <label className={`${lbl} min-w-52`}>
              Change membership
              <select className="field" value={m.plan.code} onChange={(e) => act("member_switch_plan", { p_plan_code: e.target.value })}>
                {plans.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {confirm ? (
              <span className="flex flex-wrap items-center gap-2 text-[0.95rem] font-medium">
                Withdraw this application?
                <button type="button" className="btn btn-ghost !min-h-10" onClick={() => act("member_cancel")}>
                  Yes, withdraw
                </button>
                <button type="button" className="btn btn-ghost !min-h-10" onClick={() => setConfirm(false)}>
                  Keep it
                </button>
              </span>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={() => setConfirm(true)}>
                Withdraw application
              </button>
            )}
          </div>
        )}
        {err && <Notice tone="bad">{err}</Notice>}
      </div>

      {a.profile.referral_code && (
        <div className="card grid gap-3 p-6 sm:p-8">
          <h3 className="h-card">Invite classmates and colleagues</h3>
          <p className="text-ink2">
            Share your link. {a.referrals > 0 ? `${a.referrals} ${a.referrals === 1 ? "person has" : "people have"} joined with it so far.` : "People who join with it are counted here."}
          </p>
          <p className="readout break-all rounded-xl bg-mist px-4 py-3 text-sm">{invite}</p>
          <div className="flex flex-wrap gap-3">
            <a className="btn btn-primary" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`I have joined GRAAS, the Global Robotics And Automation Society. Become a member here: ${invite}`)}`}>
              Share on WhatsApp
            </a>
            <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(invite)}>
              Copy link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Profile({ a, reload }: { a: Account; reload: (msg?: string) => void }) {
  const p = a.profile;
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [pw, setPw] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    const { data } = await sb().rpc("member_update_profile", { p: { ...f, phone: String(f.phone).replace(/\D/g, "").slice(-10) } });
    if (data?.ok) {
      setMsg({ tone: "good", text: "Saved." });
      reload();
    } else setMsg({ tone: "bad", text: data?.error ?? "Could not save." });
  }
  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const a1 = String(f.get("new_password")), a2 = String(f.get("new_password2"));
    if (a1.length < 8) return setPw({ tone: "bad", text: "Use at least 8 characters." });
    if (a1 !== a2) return setPw({ tone: "bad", text: "The two passwords do not match." });
    const { error } = await sb().auth.updateUser({ password: a1 });
    if (error) return setPw({ tone: "bad", text: "Could not change the password. Sign out, sign in again and retry." });
    form.reset();
    setPw({ tone: "good", text: "Password changed." });
  }
  const org = p.kind === "student" ? "College or institute" : p.kind === "professional" ? "Company or organisation" : "Organisation";
  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <form onSubmit={save} className="card grid gap-4 p-6 sm:p-8">
        <h2 className="h-card !text-2xl">Your details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={lbl}>
            Full name
            <input name="full_name" className="field" defaultValue={p.full_name ?? ""} maxLength={80} required />
          </label>
          <label className={lbl}>
            Mobile number
            <input name="phone" className="field" type="tel" inputMode="numeric" defaultValue={p.phone ?? ""} maxLength={14} required />
          </label>
          <label className={lbl}>
            Email
            <input className="field bg-mist" value={p.email ?? ""} readOnly aria-describedby="email-note" />
            <span id="email-note" className="text-sm font-normal text-ink2">You sign in with this email. To change it, write to us from the Help tab.</span>
          </label>
          <label className={lbl}>
            City
            <input name="city" className="field" defaultValue={p.city ?? ""} maxLength={80} />
          </label>
          <label className={lbl}>
            State
            <select name="state" className="field" defaultValue={p.state ?? "Maharashtra"}>
              {INDIAN_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
              <option value="Outside India">Outside India</option>
            </select>
          </label>
          <label className={lbl}>
            {org}
            <input name="organisation" className="field" defaultValue={p.organisation ?? ""} maxLength={120} />
          </label>
          <label className={lbl}>
            {p.kind === "student" ? "Course and year" : "Designation"}
            <input name="designation" className="field" defaultValue={p.designation ?? ""} maxLength={120} />
          </label>
          <label className={lbl}>
            <span>
              Website <span className="font-normal text-ink2">(optional)</span>
            </span>
            <input name="website" className="field" defaultValue={p.website ?? ""} maxLength={160} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button className="btn btn-primary">Save details</button>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        </div>
      </form>
      <form onSubmit={changePassword} className="card grid content-start gap-4 p-6 sm:p-8">
        <h2 className="h-card !text-2xl">Change password</h2>
        <label className={lbl}>
          New password
          <input name="new_password" type="password" className="field" autoComplete="new-password" minLength={8} maxLength={72} required />
        </label>
        <label className={lbl}>
          Type it again
          <input name="new_password2" type="password" className="field" autoComplete="new-password" maxLength={72} required />
        </label>
        <button className="btn btn-ghost justify-self-start">Change password</button>
        {pw && <Notice tone={pw.tone}>{pw.text}</Notice>}
      </form>
    </div>
  );
}

function Help({ a, reload }: { a: Account; reload: (msg?: string) => void }) {
  const [err, setErr] = useState("");
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setErr("");
    const { error } = await sb().from("tickets").insert({ user_id: a.profile.id, subject: String(f.get("subject")).trim(), message: String(f.get("message")).trim() });
    if (error) return setErr("Could not send. The subject needs at least 3 characters and the message at least 5.");
    form.reset();
    reload("Your message has been sent to GRAAS. The reply will appear here.");
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <form onSubmit={send} className="card grid content-start gap-4 p-6 sm:p-8">
        <h2 className="h-card !text-2xl">Write to GRAAS</h2>
        <label className={lbl}>
          Subject
          <input name="subject" className="field" maxLength={140} required />
        </label>
        <label className={lbl}>
          Message
          <textarea name="message" className="field min-h-36" maxLength={2000} required />
        </label>
        <button className="btn btn-primary justify-self-start">Send message</button>
        {err && <Notice tone="bad">{err}</Notice>}
        <p className="text-sm text-ink2">
          Rules, refunds and privacy are explained in{" "}
          <Link href="/policies" className="font-semibold underline decoration-go decoration-2 underline-offset-4">
            Rules and policies
          </Link>
          .
        </p>
      </form>
      <div className="card p-6 sm:p-8">
        <h2 className="h-card !text-2xl">Your messages</h2>
        {a.tickets.length === 0 && <p className="mt-3 text-ink2">Nothing yet. Messages you send and the replies appear here.</p>}
        <ul className="mt-4 grid gap-4">
          {a.tickets.map((t) => (
            <li key={t.id} className="rounded-2xl border border-line p-4">
              <p className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{t.subject}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.status === "open" ? "bg-[#fff4e5] text-[#8a4b00]" : "bg-go-soft text-go-deep"}`}>{t.status === "open" ? "Waiting for reply" : t.status === "answered" ? "Answered" : "Closed"}</span>
              </p>
              <p className="mt-1 whitespace-pre-line text-[0.95rem] text-ink2">{t.message}</p>
              <p className="mt-1 text-xs text-ink2">{shortDate(t.created_at)}</p>
              {t.reply && (
                <div className="mt-3 rounded-xl bg-mist p-3">
                  <p className="text-xs font-semibold text-ink2">Reply from GRAAS, {shortDate(t.replied_at)}</p>
                  <p className="mt-1 whitespace-pre-line text-[0.95rem]">{t.reply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function AccountApp({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [a, setA] = useState<Account | null>(null);
  const [tab, setTab] = useState("overview");
  const [flash, setFlash] = useState(params.get("welcome") ? "Your account is ready and your application is saved." : "");
  const [org, setOrg] = useState<any>(null);
  const [receipt, setReceipt] = useState<any>(null);

  const load = useCallback(async () => {
    const { data } = await sb().rpc("my_account");
    setA((data as Account) ?? null);
    return data as Account | null;
  }, []);

  useEffect(() => {
    sb()
      .auth.getSession()
      .then(({ data }) => setSession(data.session));
    const { data } = sb().auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (session === null) router.replace("/signin");
    if (!session) return;
    load().then(async (acct) => {
      // A payment made just before the page was closed is picked up here.
      if (acct?.membership?.status === "pending_payment" && acct.pay_online) {
        const r = await portal("recheck");
        if (r.ok && Number(r.updated) > 0) load();
      }
    });
    sb()
      .from("site_settings")
      .select("value")
      .eq("key", "org")
      .maybeSingle()
      .then(({ data }) => setOrg(data?.value ?? null));
  }, [session, load, router]);

  if (!session || !a) return <div className="shell py-24 text-ink2">Loading your account…</div>;
  if (!a.profile) return <div className="shell py-24 text-ink2">Your account could not be loaded. Please sign out and sign in again.</div>;

  const m = a.membership;
  const state = effectiveStatus(m, a.today);
  const hasId = !!m?.member_no && (state === "active" || state === "expired");
  const reload = (msg?: string) => {
    if (msg) setFlash(msg);
    load();
  };
  const tabs = [
    { id: "overview", label: "Overview", show: true },
    { id: "card", label: "Member ID", show: hasId },
    { id: "certificate", label: "Certificate", show: hasId && state === "active" },
    { id: "payments", label: "Payments", show: true },
    { id: "profile", label: "Profile", show: true },
    { id: "help", label: "Help", show: true },
  ].filter((t) => t.show);

  return (
    <section className="min-h-[70vh] bg-mist">
      <div className="shell py-8 lg:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
          <div>
            <p className="text-sm text-ink2">My account</p>
            <h1 className="h-section !text-[clamp(1.8rem,1.3rem+2vw,2.8rem)]">{a.profile.full_name ?? a.profile.email}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {a.is_staff && (
              <Link href="/admin" className="btn btn-ghost !min-h-11">
                Staff admin
              </Link>
            )}
            <button type="button" className="btn btn-ghost !min-h-11" onClick={() => sb().auth.signOut()}>
              Sign out
            </button>
          </div>
        </div>
        <div role="tablist" aria-label="Account sections" className="mt-6 flex gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-[var(--shadow-card)] print:hidden sm:inline-flex">
          {tabs.map((t) => (
            <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-[0.95rem] font-semibold transition-colors ${tab === t.id ? "bg-ink text-white" : "text-ink2 hover:text-ink"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {flash && (
          <div className="mt-5 print:hidden" role="status">
            <Notice tone="good">{flash}</Notice>
          </div>
        )}
        <div className="mt-6">
          {tab === "overview" && <Overview a={a} plans={plans} state={state} reload={reload} />}
          {tab === "card" && hasId && (
            <div className="card grid gap-6 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                <h2 className="h-card !text-2xl">Digital member ID</h2>
                <PrintButton label="Print or save as PDF" />
              </div>
              <IdCard a={a} />
              <p className="max-w-xl text-ink2 print:hidden">Anyone can scan the code, or type your member number at {typeof window !== "undefined" ? window.location.host : ""}/verify, to confirm that this membership is current.</p>
            </div>
          )}
          {tab === "certificate" && hasId && (
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                <h2 className="h-card !text-2xl">Membership certificate</h2>
                <PrintButton label="Print or save as PDF" />
              </div>
              <Certificate a={a} />
            </div>
          )}
          {tab === "payments" &&
            (receipt ? (
              <div className="grid gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                  <button type="button" className="link" onClick={() => setReceipt(null)}>
                    Back to payments
                  </button>
                  <PrintButton label="Print or save as PDF" />
                </div>
                <Receipt o={receipt} org={org} />
              </div>
            ) : (
              <div className="card p-6 sm:p-8">
                <h2 className="h-card !text-2xl">Payments</h2>
                {a.orders.length === 0 && <p className="mt-3 text-ink2">No payments yet. Receipts appear here after you pay.</p>}
                <ul className="mt-4 grid gap-3">
                  {a.orders.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4">
                      <div>
                        <p className="font-semibold">
                          {o.plan_name} membership{o.kind === "renewal" ? ", renewal" : ""}
                        </p>
                        <p className="text-sm text-ink2">
                          {shortDate(o.paid_at ?? o.created_at)}
                          {o.receipt_no ? `, receipt ${o.receipt_no}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="readout font-medium">{inr(o.total_paise)}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${o.status === "paid" ? "bg-go-soft text-go-deep" : o.status === "refunded" ? "bg-mist text-ink2" : "bg-[#fff1ef] text-[#8f1a11]"}`}>{o.status === "paid" ? "Paid" : o.status === "refunded" ? "Refunded" : "Failed"}</span>
                        {o.receipt_no && (
                          <button type="button" className="btn btn-ghost !min-h-10" onClick={() => setReceipt(o)}>
                            Receipt
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          {tab === "profile" && <Profile a={a} reload={reload} />}
          {tab === "help" && <Help a={a} reload={reload} />}
        </div>
      </div>
    </section>
  );
}
