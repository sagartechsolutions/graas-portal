"use client";

import { useState } from "react";
import { portal } from "@/lib/browser";

/** Change password for logins without a member area: staff and chapter coordinators. */
export default function ChangePassword({ email, className = "", compact = false }: { email?: string; className?: string; compact?: boolean }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const pw = String(f.get("password") ?? "");
    if (pw.length < 8) return setMsg({ ok: false, text: "Use at least 8 characters." });
    if (pw !== String(f.get("password2") ?? "")) return setMsg({ ok: false, text: "The two new passwords do not match." });
    setBusy(true);
    const r = await portal("change_password", { current: String(f.get("current") ?? ""), password: pw });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error ?? "Could not change the password." });
    form.reset();
    setMsg({ ok: true, text: "Password changed. A confirmation email is on its way." });
  }
  return (
    <form onSubmit={save} className={`grid gap-3 ${className}`} noValidate>
      <div>
        <h3 className="h-card">Login and password</h3>
        {email && <p className="text-sm text-ink2">You sign in as {email}.</p>}
      </div>
      <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-3"}`}>
        <label className="grid gap-1 text-sm font-medium">
          Current password
          <input name="current" type="password" className="field" autoComplete="current-password" required />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          New password
          <input name="password" type="password" className="field" autoComplete="new-password" minLength={8} maxLength={72} required />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Type it again
          <input name="password2" type="password" className="field" autoComplete="new-password" maxLength={72} required />
        </label>
      </div>
      {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-go-deep" : "text-[#8f1a11]"}`}>{msg.text}</p>}
      <button className="btn btn-ghost justify-self-start !min-h-10" disabled={busy}>
        {busy ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
