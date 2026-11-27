"use client";

import Icon from "@/components/ui/Icon";
import { initials } from "./Details";

/**
 * For members who have applied but not paid: what they already have, what payment unlocks, and a clear way to pay.
 * Only features that exist on the portal are listed. No prices here: the fee comes from the member's plan.
 */

type Item = { icon: string; title: string; text: string };

const PERSON_UNLOCKS: Item[] = [
  { icon: "id", title: "Your member number and ID card", text: "A verified GRAAS member ID with a QR code that anyone can scan to check it." },
  { icon: "certificate", title: "Membership and pledge certificates", text: "In your name, printable, each with its own verification QR." },
  { icon: "globe", title: "A verified public profile", text: "Your own page at graas.org.in/m/your-number, with a verified badge you can share." },
  { icon: "briefcase", title: "Jobs, internships and projects", text: "Apply to opportunities from verified companies with your GRAAS profile and one-click resume." },
  { icon: "star", title: "GRAAS mark on your resume", text: "Your member number, verified badge and QR on every resume you print." },
  { icon: "calendar", title: "Member prices for events", text: "Live sessions, workshops and webinars at the member price." },
];

const ORG_UNLOCKS: Item[] = [
  { icon: "id", title: "Your member number", text: "A verified GRAAS membership with a QR page anyone can scan to check it." },
  { icon: "certificate", title: "Membership certificate", text: "In your organisation's name, printable, with its own verification QR." },
  { icon: "briefcase", title: "Post jobs, internships and projects", text: "Reach GRAAS students and professionals. Every post is checked by GRAAS." },
  { icon: "people", title: "See matching candidates", text: "The members whose profiles best match each post, when they allow companies to find them." },
  { icon: "calendar", title: "Member prices for events", text: "Live sessions, workshops and webinars at the member price for your team." },
];

const PERSON_HAVE = ["Career profile", "Resume builder", "Documents", "Events at the open price"];
const ORG_HAVE = ["Company or institution page", "Documents", "Events at the open price"];

export function unlocksFor(org: boolean) {
  return { unlock: org ? ORG_UNLOCKS : PERSON_UNLOCKS, have: org ? ORG_HAVE : PERSON_HAVE };
}

/** Thin bar on every account page while the membership is not paid. */
export function UnpaidBar({ expired, fee, onPay }: { expired: boolean; fee: string; onPay: () => void }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink px-5 py-4 text-white print:hidden" role="note">
      <p className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
          <Icon name="lock" size={16} className="text-go" />
        </span>
        <span>
          <span className="block font-semibold">{expired ? "Your membership has ended" : "Your membership is not active yet"}</span>
          <span className="text-sm text-white/70">
            {expired ? "Renew" : "Pay"} {fee ? `${fee} ` : ""}to {expired ? "get back" : "unlock"} your member ID, certificates, verified profile and opportunities.
          </span>
        </span>
      </p>
      <button type="button" className="btn btn-light !min-h-11 shrink-0" onClick={onPay}>
        {expired ? "Renew now" : "Pay and activate"}
      </button>
    </div>
  );
}

/** The full "what you are missing" panel, shown with the payment box. */
export function UnlockCard({ org, fee, onPay, needEmail }: { org: boolean; fee: string; onPay?: () => void; needEmail?: boolean }) {
  const { unlock, have } = unlocksFor(org);
  return (
    <div className="grid gap-5 rounded-[24px] border border-line bg-mist p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-go-deep">
            <span className="dot" aria-hidden="true" />
            What payment unlocks
          </p>
          <h3 className="h-card mt-1 !text-xl">You are one step away from full membership.</h3>
        </div>
        {fee && <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold">{fee}</span>}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {unlock.map((u) => (
          <li key={u.title} className="flex gap-3 rounded-2xl bg-white p-4">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mist">
              <Icon name={u.icon} size={18} className="text-ink" />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink">
                <Icon name="lock" size={10} className="text-white" />
              </span>
            </span>
            <span>
              <span className="block font-semibold leading-tight">{u.title}</span>
              <span className="mt-0.5 block text-sm text-ink2">{u.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink2">
        <span className="font-semibold text-ink">Already yours, free:</span>
        {have.map((h) => (
          <span key={h} className="inline-flex items-center gap-1">
            <Icon name="check" size={14} className="text-go-deep" />
            {h}
          </span>
        ))}
      </p>
      {needEmail && <p className="text-sm font-medium text-[#8a4b00]">First confirm your email with the code we sent (at the top of this page). Then you can pay.</p>}
      {onPay && (
        <p>
          <button type="button" className="btn btn-primary" onClick={onPay}>
            Pay and activate
          </button>
        </p>
      )}
    </div>
  );
}

/** A preview of a page that opens after payment (the member profile, or ID and certificates). */
export function LockedPage({ kind, name, planName, org, fee, onPay }: { kind: "profile" | "certificates"; name: string; planName: string; org: boolean; fee: string; onPay: () => void }) {
  return (
    <div className="grid gap-5">
      <div className="card relative overflow-hidden p-6 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none select-none blur-[2px] opacity-60">
          {kind === "profile" ? (
            <div>
              <div className="h-28 rounded-2xl bg-[linear-gradient(120deg,#000e21,#1c2b45)]" />
              <div className="-mt-10 flex items-end gap-4 px-4">
                <span className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-mist text-2xl font-semibold text-slate5">{initials(name)}</span>
                <span className="pb-1">
                  <span className="block text-xl font-semibold">{name}</span>
                  <span className="text-sm text-ink2">{planName} member · GRAAS-•••-••-•••••</span>
                </span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {["Profile strength", "Public views", "Verified certificates"].map((t) => (
                  <div key={t} className="rounded-2xl bg-mist p-4">
                    <p className="text-sm text-ink2">{t}</p>
                    <p className="readout mt-1 text-lg">••</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-ink p-5 text-white">
                <p className="text-lg font-semibold tracking-wide">GRAAS</p>
                <p className="mt-6 text-sm text-white/60">Member ID</p>
                <p className="text-lg font-semibold">{name}</p>
                <p className="readout text-sm text-white/70">GRAAS-•••-••-•••••</p>
                <div className="mt-4 h-14 w-14 rounded-md bg-white/80" />
              </div>
              <div className="rounded-2xl border border-line p-5">
                <p className="text-center text-lg font-semibold">Certificate of Membership</p>
                <p className="mt-4 text-center text-sm text-ink2">This is to certify that</p>
                <p className="mt-1 text-center text-xl font-semibold">{name}</p>
                <p className="mt-1 text-center text-sm text-ink2">is a {planName} member of the Global Robotics And Automation Society</p>
                <div className="mx-auto mt-4 h-12 w-12 rounded-full border-2 border-line" />
              </div>
            </div>
          )}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/55 p-6">
          <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-[var(--shadow-lift)]">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink">
              <Icon name="lock" size={20} className="text-go" />
            </span>
            <p className="mt-3 text-lg font-semibold">{kind === "profile" ? (org ? "Your verified member page opens after payment" : "Your verified profile opens after payment") : "Your ID card and certificates open after payment"}</p>
            <p className="mt-1 text-sm text-ink2">
              {kind === "profile"
                ? "With your member number, verified badge, QR code and a public page you can share."
                : "Printable, in your name, each with a QR code that anyone can scan to verify."}
            </p>
            <button type="button" className="btn btn-primary mt-4" onClick={onPay}>
              Pay {fee ? `${fee} ` : ""}and activate
            </button>
          </div>
        </div>
      </div>
      <UnlockCard org={org} fee={fee} />
    </div>
  );
}
