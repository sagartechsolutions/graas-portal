"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { portal } from "@/lib/browser";

const RESEND_AFTER = 45;

/** Counts down once a second while above zero. */
export function useCountdown(start = 0) {
  const [left, setLeft] = useState(start);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft] as const;
}

/** One box for a six-digit code. Phones offer the code from the SMS or email keyboard bar. */
export function CodeInput({ value, onChange, invalid, autoFocus, describedBy }: { value: string; onChange: (v: string) => void; invalid?: boolean; autoFocus?: boolean; describedBy?: string }) {
  return (
    <input
      className="field readout w-full max-w-[15rem] !text-center !text-2xl tracking-[0.45em]"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={6}
      value={value}
      autoFocus={autoFocus}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
    />
  );
}

export function Alert({ tone, children }: { tone: "bad" | "good" | "info"; children: React.ReactNode }) {
  const cls = tone === "bad" ? "border border-[#c2261a] bg-[#fff1ef] text-[#8f1a11]" : tone === "good" ? "bg-go-soft text-go-deep" : "bg-mist text-ink";
  return (
    <p role={tone === "bad" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-[0.95rem] font-medium ${cls}`}>
      {children}
    </p>
  );
}

/**
 * Enter a code that was sent for `purpose`, with a button to send a new one.
 * `extra` goes with both calls (for example the new email address when changing email).
 */
export function CodeForm({
  purpose,
  extra = {},
  sent = true,
  submitLabel = "Confirm",
  onDone,
  onCancel,
}: {
  purpose: "verify_email" | "verify_phone" | "change_email";
  extra?: Record<string, unknown>;
  sent?: boolean;
  submitLabel?: string;
  onDone: (r: any) => void;
  onCancel?: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [left, setLeft] = useCountdown(sent ? RESEND_AFTER : 0);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return setErr("Enter the 6-digit code.");
    setBusy(true);
    setErr("");
    setNote("");
    const r = await portal("verify_code", { purpose, code, ...extra });
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "Could not check the code. Please try again.");
    onDone(r);
  }
  async function resend() {
    setErr("");
    setNote("");
    setLeft(RESEND_AFTER);
    const r = await portal("send_code", { purpose, ...extra });
    if (!r.ok) {
      setErr(r.error ?? "Could not send a new code. Please try again.");
      if (!r.wait) setLeft(0);
      return;
    }
    if (r.already) return onDone(r);
    setCode("");
    setNote("A new code is on its way. Codes sent earlier no longer work.");
  }

  return (
    <form onSubmit={confirm} className="grid gap-3" noValidate>
      <label className="grid gap-1.5 text-[0.95rem] font-medium">
        6-digit code
        <CodeInput value={code} onChange={setCode} invalid={!!err} autoFocus describedBy={err ? `${purpose}-err` : undefined} />
      </label>
      {err && (
        <span id={`${purpose}-err`}>
          <Alert tone="bad">{err}</Alert>
        </span>
      )}
      {note && <Alert tone="good">{note}</Alert>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Checking…" : submitLabel}
        </button>
        <button type="button" className="btn btn-quiet" onClick={resend} disabled={left > 0}>
          {left > 0 ? `Send a new code in ${left}s` : "Send a new code"}
        </button>
        {onCancel && (
          <button type="button" className="link text-[0.95rem]" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

/** A card that asks the member to confirm their email or WhatsApp number. Sends the first code on request. */
export function VerifyCard({ kind, target, required, onDone }: { kind: "email" | "phone"; target: string; required?: boolean; onDone: () => void }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const purpose = kind === "email" ? "verify_email" : "verify_phone";

  async function send() {
    setBusy(true);
    setErr("");
    const r = await portal("send_code", { purpose });
    setBusy(false);
    if (r.already) return onDone();
    if (!r.ok && !r.wait) return setErr(r.error ?? "Could not send the code. Please try again.");
    setSent(true);
  }

  const title = kind === "email" ? "Confirm your email" : "Confirm your WhatsApp number";
  const why =
    kind === "email"
      ? `We send codes, receipts and membership updates to ${target}. ${required ? "Confirm it before you pay." : "Confirm it so they reach you."}`
      : `Get codes and membership updates on WhatsApp at ${target}. ${required ? "Confirm it before you pay." : "It takes a few seconds."}`;
  return (
    <div className={`card grid gap-4 p-5 sm:p-6 ${required ? "!border-[#e8b45a]" : ""}`}>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-[0.95rem] text-ink2">{sent ? `We sent a 6-digit code to ${target}. It works for 10 minutes.` : why}</p>
      </div>
      {sent ? (
        <CodeForm purpose={purpose} onDone={() => onDone()} />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" onClick={send} disabled={busy}>
            {busy ? "Sending…" : kind === "email" ? "Email me a code" : "Send code on WhatsApp"}
          </button>
          {err && <Alert tone="bad">{err}</Alert>}
        </div>
      )}
    </div>
  );
}
