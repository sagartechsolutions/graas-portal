"use client";

import { useCallback, useEffect, useState } from "react";
import { portal } from "@/lib/browser";
import { Msg, lbl, sb, small } from "./shared";

export type PinStatus = { has_pin: boolean; locked_until: string | null; set_at: string | null } | null;

/** Whether the signed-in admin has a security PIN, and whether key changes are locked. */
export function usePinStatus() {
  const [status, setStatus] = useState<PinStatus>(null);
  const load = useCallback(async () => {
    const { data } = await sb().rpc("staff_pin_status");
    setStatus((data as PinStatus) ?? { has_pin: false, locked_until: null, set_at: null });
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return [status, load] as const;
}

/** A masked box for the 6-digit security PIN. Browsers are asked not to remember it. */
export function PinInput({ name = "pin", label = "Your 6-digit security PIN", hint, invalid }: { name?: string; label?: string; hint?: string; invalid?: boolean }) {
  return (
    <label className={lbl}>
      {label}
      <input
        name={name}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        className="field readout max-w-[12rem] tracking-[0.4em]"
        aria-invalid={invalid || undefined}
        onInput={(e) => (e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "").slice(0, 6))}
      />
      {hint && <span className="text-sm font-normal text-ink2">{hint}</span>}
    </label>
  );
}

/**
 * Sets or resets the security PIN. Needs the account password and a code sent to the admin's own email,
 * so someone using an unattended signed-in screen cannot set one.
 */
export function PinSetup({ hasPin, onDone, onCancel }: { hasPin: boolean; onDone: () => void; onCancel?: () => void }) {
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  async function sendCode() {
    setBusy(true);
    setMsg(null);
    const r = await portal("pin_code");
    setBusy(false);
    if (!r.ok && !r.wait) return setMsg({ tone: "bad", text: r.error ?? "Could not send the code." });
    setSent(String(r.sent_to ?? "your email"));
    if (r.wait) setMsg({ tone: "bad", text: r.error ?? "A code was just sent. Wait a minute before asking for another." });
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pin = String(f.get("new_pin") ?? "");
    if (pin !== String(f.get("new_pin2") ?? "")) return setMsg({ tone: "bad", text: "The two PINs do not match." });
    setBusy(true);
    setMsg(null);
    const r = await portal("set_pin", { password: f.get("password"), code: f.get("code"), pin });
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "bad", text: r.error ?? "Could not save the PIN." });
    onDone();
  }

  return (
    <div className="plate grid gap-4 border-2 !border-[#e8b45a] p-5 sm:p-6">
      <div>
        <h3 className="text-xl font-semibold">{hasPin ? "Reset your security PIN" : "Set up your security PIN"}</h3>
        <p className="mt-1 max-w-3xl text-sm text-ink2">
          A 6-digit PIN that only you know. It is needed to save, change or remove the Razorpay keys, to switch online payment on or off, and to change the email or WhatsApp keys. It is stored scrambled, so nobody can read it back. Five wrong tries lock key changes for 30 minutes and email an alert.
        </p>
      </div>
      {!sent ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-go !min-h-10 !py-2" onClick={sendCode} disabled={busy}>
            {busy ? "Sending…" : "Email me a code"}
          </button>
          {onCancel && (
            <button type="button" className={small} onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={save} className="grid gap-4" autoComplete="off">
          <p className="text-sm">
            We sent a 6-digit code to <strong>{sent}</strong>. It works for 10 minutes.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={lbl}>
              Code from the email
              <input name="code" className="field readout max-w-[12rem] tracking-[0.3em]" inputMode="numeric" maxLength={6} autoComplete="one-time-code" />
            </label>
            <label className={lbl}>
              Your account password
              <input name="password" type="password" className="field" autoComplete="current-password" />
            </label>
            <PinInput name="new_pin" label="New 6-digit PIN" hint="Not all the same digit, and not in order like 123456." />
            <PinInput name="new_pin2" label="Type the PIN again" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-go !min-h-10 !py-2" disabled={busy}>
              {busy ? "Saving…" : "Save PIN"}
            </button>
            <button type="button" className={small} onClick={sendCode} disabled={busy}>
              Send a new code
            </button>
            {onCancel && (
              <button type="button" className={small} onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
    </div>
  );
}

/** One line under a key form: when the PIN was set, a lock notice, and a way to reset it. */
export function PinNote({ status, onReset }: { status: PinStatus; onReset: () => void }) {
  if (!status?.has_pin) return null;
  return (
    <p className="text-sm text-ink2">
      {status.locked_until
        ? `Key changes are locked after wrong PINs until ${new Date(status.locked_until).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}. `
        : "Your security PIN is set. "}
      <button type="button" className="link" onClick={onReset}>
        Forgot or want to change it?
      </button>
    </p>
  );
}
