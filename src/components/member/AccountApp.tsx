"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Logo from "@/components/site/Logo";
import { browserClient, portal } from "@/lib/browser";
import { INDIAN_STATES, STATUS_LABEL, effectiveStatus, inr, shortDate } from "@/lib/money";
import type { Plan } from "@/lib/site";
import { EMPTY_OPTIONS, GuardianFields, ORG_LABEL, PersonFields, ROLE_HINT, ROLE_LABEL, initials, isIndividual, isMinor, removePhoto, uploadPhoto, usePhoto, type ProfileOptions } from "./Details";
import { planFee } from "./JoinApp";
import { Certificate, IdCards } from "./MemberDocs";
import { Alert, CodeForm, VerifyCard } from "./Verify";

type Channels = { email: boolean; whatsapp: boolean; email_required: boolean; phone_required: boolean };
type Account = { profile: any; membership: any | null; orders: any[]; tickets: any[]; referrals: number; pay_online: boolean; is_staff: boolean; today: string; channels?: Channels; options?: ProfileOptions };
const sb = () => browserClient();
const lbl = "grid gap-1.5 text-[0.95rem] font-medium";

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

/** Opens Razorpay for an order the portal created, then confirms the payment. */
async function openCheckout(o: any, done: (msg?: string) => void, setBusy: (b: boolean) => void, setMsg: (m: string) => void) {
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
    description: String(o.description ?? "GRAAS membership"),
    prefill: o.prefill,
    theme: { color: "#000e21" },
    modal: { ondismiss: () => setBusy(false) },
    handler: async (r: any) => {
      setMsg("Confirming your payment…");
      const v = await portal("verify_payment", { rzp_order_id: r.razorpay_order_id, rzp_payment_id: r.razorpay_payment_id, signature: r.razorpay_signature });
      setBusy(false);
      done(v.ok ? "Payment received. Thank you." : v.error);
    },
  });
  rz.on("payment.failed", () => setMsg("The payment did not go through. Nothing was charged, or it will be reversed by your bank. You can try again."));
  rz.open();
}

/* Fee, coupon and the Razorpay checkout. Used for a first payment and for renewal. */
function PayPanel({ a, renewal, onChange }: { a: Account; renewal: boolean; onChange: (msg?: string) => void }) {
  const m = a.membership;
  const terms: { years: number; label: string; discount_percent: number; quote: any }[] = (m.terms ?? []).filter((t: any) => t.quote?.ok);
  const [years, setYears] = useState<number>(1);
  const [quote, setQuote] = useState<any>(m.quote);
  const [coupon, setCoupon] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function requote(y: number, code: string) {
    if (!code) {
      const t = terms.find((x) => x.years === y);
      if (t) return setQuote(t.quote);
    }
    const { data } = await sb().rpc("quote_plan", { p_plan_code: m.plan.code, p_coupon: code || null, p_years: y });
    if (data) setQuote(data);
  }
  async function chooseTerm(y: number) {
    setYears(y);
    await requote(y, quote?.coupon ?? "");
  }
  async function applyCoupon() {
    await requote(years, coupon.trim());
  }
  async function pay() {
    setBusy(true);
    setMsg("");
    const o = await portal("create_order", { coupon: quote?.coupon ?? "", years });
    if (!o.ok) {
      setMsg(o.error ?? "Could not start the payment.");
      if (o.need) document.getElementById("confirm-contact")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return setBusy(false);
    }
    if (o.free) return onChange("Your membership is active.");
    await openCheckout(o, (t) => onChange(t === "Payment received. Thank you." ? "Payment received. Your membership is active." : t), setBusy, setMsg);
  }

  if (quote?.fee_pending) return <Notice tone="warn">The fee for this membership has not been announced yet. Your application is saved; we will message you when payment opens, and you can pay here.</Notice>;
  if (!quote?.ok) return <Notice tone="bad">{quote?.error ?? "The fee could not be worked out."}</Notice>;
  const row = "flex items-baseline justify-between gap-4 py-2";
  const showTerms = terms.length > 1 && quote.annual_paise > 0;
  return (
    <div className="grid gap-4">
      {showTerms && (
        <fieldset>
          <legend className="text-[0.95rem] font-semibold">{renewal ? "Renew for" : "Choose how long"}</legend>
          <p className="mt-0.5 text-sm text-ink2">Pay once for a longer membership and save.</p>
          <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {terms.map((t) => {
              const on = years === t.years;
              const perYear = Math.round(t.quote.total_paise / t.years);
              return (
                <label
                  key={t.years}
                  className={`relative cursor-pointer rounded-2xl border-2 p-3.5 transition-colors sm:p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-go-deep ${on ? "border-ink bg-white" : "border-line bg-white hover:border-slate5"}`}
                >
                  <input type="radio" name="term" className="sr-only" checked={on} onChange={() => chooseTerm(t.years)} />
                  <span className="block font-semibold">{t.label}</span>
                  <span className="readout mt-1 block text-lg font-semibold sm:text-xl">{inr(t.quote.total_paise)}</span>
                  <span className="block text-sm text-ink2">{t.years > 1 ? `${inr(perYear)} a year` : "per year"}</span>
                  {Number(t.discount_percent) > 0 && (
                    <span className="mt-2 inline-flex rounded-full bg-go-soft px-2.5 py-0.5 text-xs font-semibold text-go-deep">Save {Number(t.discount_percent)}%</span>
                  )}
                </label>
              );
            })}
          </div>
          {years === 10 && <p className="mt-2 text-sm text-ink2">Lifetime membership runs for 10 years from the day it starts.</p>}
        </fieldset>
      )}
      <dl className="rounded-2xl bg-mist px-5 py-3">
        <div className={row}>
          <dt>
            {quote.plan_name} membership, {quote.term_label ?? "1 year"}
            {renewal ? ", renewal" : ""}
            {quote.term_years > 1 && (
              <span className="block text-sm text-ink2">
                {quote.term_years} × {inr(quote.annual_paise)}
              </span>
            )}
          </dt>
          <dd className="readout whitespace-nowrap">{inr(quote.base_paise)}</dd>
        </div>
        {quote.term_discount_paise > 0 && (
          <div className={row}>
            <dt>Discount for {quote.term_label} ({Number(quote.term_discount_percent)}%)</dt>
            <dd className="readout whitespace-nowrap">− {inr(quote.term_discount_paise)}</dd>
          </div>
        )}
        {quote.discount_paise > 0 && (
          <div className={row}>
            <dt>Discount ({quote.coupon})</dt>
            <dd className="readout whitespace-nowrap">− {inr(quote.discount_paise)}</dd>
          </div>
        )}
        {quote.gst_paise > 0 && (
          <div className={row}>
            <dt>GST at {Number(quote.gst_percent)}%</dt>
            <dd className="readout whitespace-nowrap">{inr(quote.gst_paise)}</dd>
          </div>
        )}
        <div className={`${row} border-t border-line text-lg font-semibold`}>
          <dt>To pay</dt>
          <dd className="readout whitespace-nowrap">{inr(quote.total_paise)}</dd>
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
            {o.purpose === "change" ? `Change of membership type to ${o.plan_name}, ${o.term_label ?? ""}` : `${o.plan_name} membership, ${o.term_label ?? "1 year"} (${o.kind === "renewal" ? "renewal" : "new"})`}
          </dt>
          <dd className="readout">{inr(o.base_paise)}</dd>
        </div>
        {o.term_discount_paise > 0 && (
          <div className={row}>
            <dt>Discount for {o.term_label ?? "1 year"}</dt>
            <dd className="readout">− {inr(o.term_discount_paise)}</dd>
          </div>
        )}
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

/** The fields a member type needs: organisation, role (not for students), gender and student details. */
function TypeFields({ audience, a }: { audience: string; a: Account }) {
  // Details carry over only within the same kind of member; a student moving to a job starts with a blank company.
  const same = audience === (a.membership?.plan?.audience ?? a.profile.kind);
  const p = same ? a.profile : { gender: a.profile.gender };
  const options = a.options ?? EMPTY_OPTIONS;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={lbl}>
        {ORG_LABEL[audience] ?? "Organisation"}
        <input name="organisation" className="field" defaultValue={p.organisation ?? ""} maxLength={120} required />
      </label>
      {ROLE_LABEL[audience] && (
        <label className={lbl}>
          {ROLE_LABEL[audience]}
          <input name="designation" className="field" defaultValue={p.designation ?? ""} maxLength={120} placeholder={ROLE_HINT[audience]} />
        </label>
      )}
      <PersonFields key={audience} audience={audience} options={options} initial={p} lbl={lbl} />
    </div>
  );
}

const formDetails = (form: HTMLFormElement) => {
  const f = new FormData(form);
  const v = (k: string) => String(f.get(k) ?? "").trim();
  return { organisation: v("organisation"), designation: v("designation"), gender: v("gender"), course: v("course"), branch: v("branch"), study_year: v("study_year") };
};

/** Before payment: the member changes type at once, giving the details the new type needs. */
function SwitchType({ a, plans, reload }: { a: Account; plans: Plan[]; reload: (msg?: string) => void }) {
  const m = a.membership;
  const [to, setTo] = useState<string>(m.plan.code);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const target = plans.find((p) => p.code === to);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target) return;
    setBusy(true);
    setErr("");
    const { data } = await sb().rpc("member_switch_type", { p_plan_code: to, p_details: formDetails(e.currentTarget) });
    setBusy(false);
    if (!data?.ok) return setErr(data?.error ?? "That did not work. Please try again.");
    reload(`Your membership is now ${target.name}. Your member ID will show these details.`);
  }
  return (
    <div className="grid gap-4">
      <label className={`${lbl} max-w-xs`}>
        Change membership type
        <select className="field" value={to} onChange={(e) => setTo(e.target.value)}>
          {plans.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
              {p.code === m.plan.code ? " (current)" : ""}
            </option>
          ))}
        </select>
      </label>
      {target && to !== m.plan.code && (
        <form onSubmit={save} className="grid gap-4 rounded-2xl border border-line p-4 sm:p-5" noValidate>
          <p className="text-[0.95rem] text-ink2">
            Check the details for a {target.name.toLowerCase()} membership. {target.requires_approval ? "GRAAS verifies this type before payment." : ""}
          </p>
          <TypeFields audience={target.audience} a={a} />
          {err && <Notice tone="bad">{err}</Notice>}
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary !min-h-11" disabled={busy}>
              {busy ? "Saving…" : `Change to ${target.name}`}
            </button>
            <button type="button" className="btn btn-ghost !min-h-11" onClick={() => setTo(m.plan.code)}>
              Keep {m.plan.name}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** After payment: the member asks GRAAS to change type; staff approve it, with a fee difference if one applies. */
function ChangeType({ a, plans, reload }: { a: Account; plans: Plan[]; reload: (msg?: string) => void }) {
  const m = a.membership;
  const r = m.change;
  const options: { code: string; name: string; audience: string; estimate_paise: number | null }[] = m.change_options ?? [];
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState<string>("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const target = plans.find((p) => p.code === to);
  const est = options.find((o) => o.code === to)?.estimate_paise;
  const recent = r && (r.status === "done" || r.status === "declined") && (new Date(a.today).getTime() - new Date(r.decided_at ?? r.completed_at ?? r.created_at).getTime()) / 86400000 < 30;

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target) return setErr("Choose the membership you want.");
    setBusy(true);
    setErr("");
    const reason = String(new FormData(e.currentTarget).get("reason") ?? "").trim();
    const { data } = await sb().rpc("member_request_change", { p_plan_code: to, p_details: formDetails(e.currentTarget), p_reason: reason });
    setBusy(false);
    if (!data?.ok) return setErr(data?.error ?? "Could not send the request.");
    setOpen(false);
    reload("Your request is sent. GRAAS will reply by email.");
  }
  async function cancel() {
    const { data } = await sb().rpc("member_cancel_change");
    if (data?.ok) reload("Your change request is cancelled.");
    else setErr(data?.error ?? "Could not cancel.");
  }
  async function pay() {
    setBusy(true);
    setMsg("");
    const o = await portal("create_order", { purpose: "change" });
    if (!o.ok) {
      setMsg(o.error ?? "Could not start the payment.");
      return setBusy(false);
    }
    await openCheckout(o, (t) => reload(t === "Payment received. Thank you." ? "Payment received. Your membership type is changed." : t), setBusy, setMsg);
  }

  if (r && r.status === "pending")
    return (
      <div className="grid gap-3 border-t border-line pt-6">
        <h3 className="h-card">Change of membership type</h3>
        <Notice>
          You asked to change from {r.from_name} to {r.to_name} on {shortDate(r.created_at)}. GRAAS is checking it and will reply by email. Your current membership stays active meanwhile.
        </Notice>
        <p>
          <button type="button" className="link text-sm" onClick={cancel}>
            Cancel this request
          </button>
        </p>
        {err && <Notice tone="bad">{err}</Notice>}
      </div>
    );
  if (r && r.status === "awaiting_payment") {
    const total = Number(r.charge_paise) + Number(r.gst_paise ?? 0);
    return (
      <div className="grid gap-4 border-t border-line pt-6">
        <h3 className="h-card">Complete your change to {r.to_name}</h3>
        <p className="text-ink2">
          GRAAS approved your request. Pay the fee difference to complete it. Your member number {m.member_no} and end date {m.ends_on ? shortDate(m.ends_on) : ""} stay the same.
        </p>
        {r.staff_note && <Notice>Note from GRAAS: {r.staff_note}</Notice>}
        <dl className="rounded-2xl bg-mist px-5 py-3">
          <div className="flex items-baseline justify-between gap-4 py-2">
            <dt>Fee difference, {r.from_name} to {r.to_name}</dt>
            <dd className="readout whitespace-nowrap">{inr(r.charge_paise)}</dd>
          </div>
          {Number(r.gst_paise) > 0 && (
            <div className="flex items-baseline justify-between gap-4 py-2">
              <dt>GST</dt>
              <dd className="readout whitespace-nowrap">{inr(r.gst_paise)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-4 border-t border-line py-2 text-lg font-semibold">
            <dt>To pay</dt>
            <dd className="readout whitespace-nowrap">{inr(total)}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-4">
          {a.pay_online ? (
            <button type="button" className="btn btn-primary" onClick={pay} disabled={busy}>
              {busy ? "Opening payment…" : `Pay ${inr(total)}`}
            </button>
          ) : (
            <Notice tone="warn">Online payment opens shortly. You will be able to pay here.</Notice>
          )}
          <button type="button" className="link text-sm" onClick={cancel}>
            Cancel the change
          </button>
        </div>
        {msg && <Notice tone="warn">{msg}</Notice>}
        {err && <Notice tone="bad">{err}</Notice>}
      </div>
    );
  }
  return (
    <div className="grid gap-4 border-t border-line pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="h-card">Change of membership type</h3>
          <p className="text-ink2">Moved from college to a job, or need a different membership? Ask GRAAS to change it. Your member number stays the same.</p>
        </div>
        {!open && (
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
            Ask for a change
          </button>
        )}
      </div>
      {recent && r.status === "done" && <Notice tone="good">Your membership was changed to {r.to_name} on {shortDate(r.completed_at)}.</Notice>}
      {recent && r.status === "declined" && (
        <Notice tone="warn">
          Your request to change to {r.to_name} was not approved.{r.staff_note ? ` Reason given: ${r.staff_note}` : ""}
        </Notice>
      )}
      {open && (
        <form onSubmit={send} className="grid gap-4 rounded-2xl border border-line p-4 sm:p-5" noValidate>
          <label className={`${lbl} max-w-sm`}>
            Change to
            <select className="field" value={to} onChange={(e) => setTo(e.target.value)} required>
              <option value="" disabled>
                Choose a membership
              </option>
              {options.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          {target && (
            <>
              <p className="rounded-xl bg-mist px-4 py-3 text-[0.95rem]">
                {est === null || est === undefined
                  ? "GRAAS will tell you if a fee difference applies."
                  : est === 0
                    ? "No extra fee is expected for this change."
                    : `Expected fee difference: about ${inr(est)} for the time left on your membership. GRAAS confirms the amount when approving.`}
              </p>
              <TypeFields audience={target.audience} a={a} />
              <label className={lbl}>
                <span>
                  Why are you changing? <span className="font-normal text-ink2">(optional)</span>
                </span>
                <textarea name="reason" className="field min-h-20" maxLength={500} placeholder="For example: I finished my degree and now work at an automation company." />
              </label>
            </>
          )}
          {err && <Notice tone="bad">{err}</Notice>}
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary !min-h-11" disabled={busy || !target}>
              {busy ? "Sending…" : "Send request"}
            </button>
            <button type="button" className="btn btn-ghost !min-h-11" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
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
        {state === "active" && <ChangeType a={a} plans={plans} reload={reload} />}
        {state === "active" && renewable && (
          <div className="grid gap-3 border-t border-line pt-6">
            <h3 className="h-card">Renew your membership</h3>
            <p className="text-ink2">Renewing now adds a full period after {shortDate(m.ends_on)}. You lose no days.</p>
            <PayPanel a={a} renewal onChange={reload} />
          </div>
        )}

        {(state === "pending_approval" || state === "pending_payment") && (
          <div className="grid gap-4 border-t border-line pt-5">
            <SwitchType a={a} plans={plans} reload={reload} />
            <div>
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
              <button type="button" className="link text-sm" onClick={() => setConfirm(true)}>
                Withdraw application
              </button>
            )}
            </div>
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

function Verified({ on, label }: { on: boolean; label?: string }) {
  return on ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-go-soft px-2.5 py-0.5 text-xs font-semibold text-go-deep">
      <svg width="11" height="11" viewBox="0 0 14 14" aria-hidden="true">
        <path d="M2.5 7.5 5.8 10.5 11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label ?? "Confirmed"}
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-[#fff4e5] px-2.5 py-0.5 text-xs font-semibold text-[#8a4b00]">Not confirmed</span>
  );
}

/* Change the sign-in email: a code goes to the new address, and the old address gets a notice. */
function ChangeEmail({ a, done }: { a: Account; done: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!a.channels?.email) return <span className="text-sm font-normal text-ink2">You sign in with this email. To change it, write to us from the Help tab.</span>;
  if (!open)
    return (
      <button type="button" className="link justify-self-start text-sm" onClick={() => setOpen(true)}>
        Change email
      </button>
    );
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await portal("send_code", { purpose: "change_email", email: email.trim() });
    setBusy(false);
    if (!r.ok && !r.wait) return setErr(r.error ?? "Could not send the code.");
    setSent(true);
  }
  return (
    <div className="mt-2 grid gap-3 rounded-2xl bg-mist p-4 font-normal">
      {!sent ? (
        <form onSubmit={send} className="grid gap-3" noValidate>
          <label className={lbl}>
            New email address
            <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} />
          </label>
          {err && <Alert tone="bad">{err}</Alert>}
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary !min-h-10" disabled={busy}>
              {busy ? "Sending…" : "Send code to new email"}
            </button>
            <button type="button" className="link text-sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-[0.95rem]">
            We sent a code to <strong className="break-all">{email.trim().toLowerCase()}</strong>. Your email changes once you enter it.
          </p>
          <CodeForm
            purpose="change_email"
            extra={{ email: email.trim() }}
            submitLabel="Change email"
            onCancel={() => setOpen(false)}
            onDone={async () => {
              await sb().auth.refreshSession();
              done("Your email is changed. Sign in with the new address from now on.");
            }}
          />
        </>
      )}
    </div>
  );
}

function Alerts({ a, reload }: { a: Account; reload: (msg?: string) => void }) {
  const p = a.profile;
  const [news, setNews] = useState<boolean>(p.email_news !== false);
  const [wa, setWa] = useState<boolean>(!!p.wa_updates);
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const phoneOk = !!p.phone_verified_at;
  async function save(next: { news?: boolean; wa?: boolean }) {
    const n = next.news ?? news;
    const w = next.wa ?? wa;
    setNews(n);
    setWa(w);
    setMsg(null);
    const { data } = await sb().rpc("member_set_alerts", { p_wa_updates: w, p_email_news: n });
    if (data?.ok) {
      setMsg({ tone: "good", text: "Saved." });
      reload();
    } else {
      setMsg({ tone: "bad", text: data?.error ?? "Could not save." });
      setNews(p.email_news !== false);
      setWa(!!p.wa_updates);
    }
  }
  const row = "flex items-start justify-between gap-4 border-t border-line py-4 first:border-t-0 first:pt-0";
  return (
    <div className="card grid content-start p-6 sm:p-8">
      <h2 className="h-card !text-2xl">Messages from GRAAS</h2>
      <div className="mt-4 grid">
        <div className={row}>
          <div>
            <p className="font-semibold">Account and payment emails</p>
            <p className="text-sm text-ink2">Codes, receipts, approvals and renewal reminders. Always on, because your membership depends on them.</p>
          </div>
          <span className="pt-1 text-sm font-semibold text-go-deep">On</span>
        </div>
        <label className={`${row} cursor-pointer`}>
          <span>
            <span className="block font-semibold">News and updates by email</span>
            <span className="block text-sm text-ink2">Events, programmes and announcements for members.</span>
          </span>
          <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#067a2e]" checked={news} onChange={(e) => save({ news: e.target.checked })} />
        </label>
        <label className={`${row} ${phoneOk ? "cursor-pointer" : ""}`}>
          <span>
            <span className="block font-semibold">Account updates on WhatsApp</span>
            <span className="block text-sm text-ink2">
              {!a.channels?.whatsapp
                ? "Coming soon. You will be able to switch this on once GRAAS WhatsApp is live."
                : phoneOk
                  ? `Approvals, receipts and reminders on +91 ${p.phone}.`
                  : "Confirm your WhatsApp number first, on the Overview tab."}
            </span>
          </span>
          <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#067a2e]" checked={wa && phoneOk} disabled={!phoneOk} onChange={(e) => save({ wa: e.target.checked })} />
        </label>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </div>
  );
}

/** Upload, replace or remove the photo used on the member ID and certificate. */
function PhotoCard({ a, reload }: { a: Account; reload: (msg?: string) => void }) {
  const p = a.profile;
  const url = usePhoto(p.id, p.photo_updated_at);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const org = a.membership && !isIndividual(a.membership.plan?.audience);
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setErr("");
    const problem = await uploadPhoto(p.id, file);
    setBusy(false);
    if (problem) return setErr(problem);
    reload(org ? "Logo saved. It now appears on your member ID and certificate." : "Photo saved. It now appears on your member ID and certificate.");
  }
  async function remove() {
    setBusy(true);
    const problem = await removePhoto(p.id);
    setBusy(false);
    if (problem) return setErr(problem);
    reload(org ? "Logo removed." : "Photo removed.");
  }
  return (
    <div className="card flex flex-wrap items-center gap-5 p-6 sm:p-8">
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-mist ring-1 ring-line">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-3xl font-semibold text-slate5">{initials(p.full_name)}</span>
        )}
      </div>
      <div className="grid min-w-0 flex-1 gap-2">
        <h2 className="h-card !text-2xl">{org ? "Logo" : "Your photo"}</h2>
        <p className="text-sm text-ink2">
          {org
            ? "Your institution's or company's logo, shown on the member ID and certificate."
            : "A clear, recent photo of your face, looking at the camera. It is shown on your member ID and certificate, and cropped to a square."}{" "}
          JPG, PNG or WebP.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className={`btn btn-primary !min-h-10 cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
            {busy ? "Saving…" : url ? "Change" : org ? "Upload logo" : "Upload photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pick} disabled={busy} />
          </label>
          {url && (
            <button type="button" className="link text-sm" onClick={remove} disabled={busy}>
              Remove
            </button>
          )}
        </div>
        {err && <Notice tone="bad">{err}</Notice>}
      </div>
    </div>
  );
}

function Profile({ a, reload }: { a: Account; reload: (msg?: string) => void }) {
  const p = a.profile;
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [pw, setPw] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    const phone = String(f.phone).replace(/\D/g, "").slice(-10);
    const guardian_phone = String(f.guardian_phone ?? "").replace(/\D/g, "").slice(-10);
    const { data } = await sb().rpc("member_update_profile", { p: { ...f, phone, guardian_phone } });
    if (data?.ok) {
      setMsg({ tone: "good", text: phone !== p.phone && p.phone_verified_at ? "Saved. Confirm your new number on WhatsApp from the Overview tab." : "Saved." });
      reload();
    } else setMsg({ tone: "bad", text: data?.error ?? "Could not save." });
  }
  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const cur = String(f.get("current_password")),
      a1 = String(f.get("new_password")),
      a2 = String(f.get("new_password2"));
    if (!cur) return setPw({ tone: "bad", text: "Enter your current password." });
    if (a1.length < 8) return setPw({ tone: "bad", text: "Use at least 8 characters for the new password." });
    if (a1 !== a2) return setPw({ tone: "bad", text: "The two new passwords do not match." });
    setPwBusy(true);
    const r = await portal("change_password", { current: cur, password: a1 });
    setPwBusy(false);
    if (!r.ok) return setPw({ tone: "bad", text: r.error ?? "Could not change the password." });
    form.reset();
    setPw({ tone: "good", text: "Password changed. We have sent you a note about it." });
  }
  const kind = a.membership?.plan?.audience ?? p.kind ?? "";
  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="grid content-start gap-5">
      <PhotoCard a={a} reload={reload} />
      <form onSubmit={save} className="card grid content-start gap-4 p-6 sm:p-8" noValidate>
        <h2 className="h-card !text-2xl">Your details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={lbl}>
            Full name
            <input name="full_name" className="field" defaultValue={p.full_name ?? ""} maxLength={80} required />
          </label>
          <label className={lbl}>
            <span className="flex flex-wrap items-center gap-2">
              Mobile number (WhatsApp) {a.channels?.whatsapp && <Verified on={!!p.phone_verified_at} />}
            </span>
            <input name="phone" className="field" type="tel" inputMode="numeric" defaultValue={p.phone ?? ""} maxLength={14} required />
            {p.phone_verified_at && <span className="text-sm font-normal text-ink2">If you change it, you confirm the new number again.</span>}
          </label>
          <div className={`${lbl} sm:col-span-2`}>
            <span className="flex flex-wrap items-center gap-2">
              Email {a.channels?.email && <Verified on={!!p.email_verified_at} />}
            </span>
            <input className="field bg-mist" value={p.email ?? ""} readOnly aria-label="Email" />
            <ChangeEmail a={a} done={(t) => reload(t)} />
          </div>
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
            {ORG_LABEL[kind] ?? "Organisation"}
            <input name="organisation" className="field" defaultValue={p.organisation ?? ""} maxLength={120} />
          </label>
          {kind !== "student" && (
            <label className={lbl}>
              {ROLE_LABEL[kind] ?? "Designation"}
              <input name="designation" className="field" defaultValue={p.designation ?? ""} maxLength={120} placeholder={ROLE_HINT[kind]} />
            </label>
          )}
          {isIndividual(kind) && <PersonFields audience={kind} options={a.options ?? EMPTY_OPTIONS} initial={p} lbl={lbl} />}
          {isIndividual(kind) && isMinor(p.dob, a.today) && <GuardianFields initial={p} lbl={lbl} />}
          <label className={`${lbl} sm:col-span-2`}>
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
        <p className="text-sm text-ink2">Your member ID and certificate always show the details saved here.</p>
      </form>
      </div>
      <div className="grid content-start gap-5">
        <Alerts a={a} reload={reload} />
        <form onSubmit={changePassword} className="card grid content-start gap-4 p-6 sm:p-8">
          <h2 className="h-card !text-2xl">Change password</h2>
          <label className={lbl}>
            Current password
            <input name="current_password" type="password" className="field" autoComplete="current-password" maxLength={72} required />
          </label>
          <label className={lbl}>
            New password
            <input name="new_password" type="password" className="field" autoComplete="new-password" minLength={8} maxLength={72} required />
          </label>
          <label className={lbl}>
            Type the new password again
            <input name="new_password2" type="password" className="field" autoComplete="new-password" maxLength={72} required />
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <button className="btn btn-ghost" disabled={pwBusy}>
              {pwBusy ? "Changing…" : "Change password"}
            </button>
            <Link href="/forgot" className="text-sm font-semibold underline decoration-go decoration-2 underline-offset-4">
              Forgot it?
            </Link>
          </div>
          {pw && <Notice tone={pw.tone}>{pw.text}</Notice>}
        </form>
      </div>
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

  if (!session || !a) return <div className="shell py-16 text-ink2">Loading your account…</div>;
  if (!a.profile) return <div className="shell py-16 text-ink2">Your account could not be loaded. Please sign out and sign in again.</div>;

  const m = a.membership;
  const state = effectiveStatus(m, a.today);
  const hasId = !!m?.member_no && (state === "active" || state === "expired");
  const reload = (msg?: string) => {
    if (msg) setFlash(msg);
    load();
  };
  const needEmail = !!a.channels?.email && !a.profile.email_verified_at;
  const needPhone = !!a.channels?.whatsapp && !!a.profile.phone && !a.profile.phone_verified_at;
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
      <div className="shell py-8 lg:py-9">
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
          {tab === "overview" && (needEmail || needPhone) && (
            <div id="confirm-contact" className="mb-5 grid gap-5 lg:grid-cols-2 print:hidden">
              {needEmail && <VerifyCard kind="email" target={a.profile.email} required={a.channels?.email_required} onDone={() => reload("Your email is confirmed.")} />}
              {needPhone && <VerifyCard kind="phone" target={`+91 ${a.profile.phone}`} required={a.channels?.phone_required} onDone={() => reload("Your WhatsApp number is confirmed. Account updates will come there too.")} />}
            </div>
          )}
          {tab === "overview" && <Overview a={a} plans={plans} state={state} reload={reload} />}
          {tab === "card" && hasId && (
            <div className="card grid gap-6 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div>
                  <h2 className="h-card !text-2xl">Digital member ID</h2>
                  <p className="text-ink2">Prints at bank-card size, front and back. Cut along the edges and keep it in your wallet.</p>
                </div>
                <PrintButton label="Print or save as PDF" />
              </div>
              {!a.profile.photo_updated_at && (
                <div className="print:hidden">
                  <Notice tone="warn">
                    Add {isIndividual(m?.plan?.audience) ? "your photo" : "your logo"} to complete your member ID.{" "}
                    <button type="button" className="font-semibold underline decoration-2 underline-offset-4" onClick={() => setTab("profile")}>
                      Go to Profile
                    </button>
                  </Notice>
                </div>
              )}
              <IdCards a={a} org={org} />
              <p className="max-w-2xl text-ink2 print:hidden">Anyone can scan the code on the back, or type your member number at {typeof window !== "undefined" ? window.location.host : ""}/verify, to confirm that this membership is current. The card always shows your latest details and membership type.</p>
            </div>
          )}
          {tab === "certificate" && hasId && (
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                <h2 className="h-card !text-2xl">Membership certificate</h2>
                <PrintButton label="Print or save as PDF" />
              </div>
              <Certificate a={a} org={org} />
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
                          {o.purpose === "change" ? `Change to ${o.plan_name} membership, ${o.term_label}` : `${o.plan_name} membership${o.term_label && o.term_label !== "1 year" ? `, ${o.term_label}` : ""}${o.kind === "renewal" ? ", renewal" : ""}`}
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
