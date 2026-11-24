"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { portal } from "@/lib/browser";
import { shortDate } from "@/lib/money";
import { Badge, Msg, Stat, lbl, sb, small, type Tone } from "./shared";

type Template = {
  event: string;
  channel: "email" | "whatsapp";
  audience: "member" | "staff";
  label: string;
  description: string | null;
  enabled: boolean;
  locked: boolean;
  subject: string | null;
  body: string;
  wa_name: string | null;
  wa_category: string | null;
  wa_params: string[];
  wa_status: string | null;
  sort: number;
};

const SAMPLE: Record<string, string> = {
  name: "Asha",
  full_name: "Asha Patil",
  plan: "Student Membership",
  amount: "₹590",
  member_no: "GRAAS-26S-00001",
  valid_till: "31 Mar 2027",
  receipt_no: "GRAAS/2026-27/00001",
  paid_on: "24 Nov 2026",
  reason: "The college ID card could not be read.",
  code: "482913",
  minutes: "10",
  link: "https://graas.org.in/account",
  site: "https://graas.org.in",
  support_email: "connect@graas.org.in",
  topic: "membership",
  days_text: "in 7 days",
  ticket_subject: "Certificate download",
  reply: "Thank you for telling us. The certificate is now ready in your account.",
  message: "I cannot download my certificate from the account page.",
  applicant: "Asha Patil",
  applicant_email: "asha@example.com",
  applicant_phone: "98XXXXXX10",
  new_email: "asha.new@example.com",
  when: "24 Nov 2026, 9:40 pm",
  subject: "Robotics workshop in Nashik",
  body: "Registrations are open for the GRAAS robotics workshop on 14 December in Nashik.\n\n[Register now](https://graas.org.in/updates)",
  next_step: "It is waiting for your approval.",
  kind: "new membership",
  note: "Payment received, but the membership was not waiting for it.",
  requested_by: "Finance desk",
  lead_name: "Rahul Shinde",
  lead_phone: "98XXXXXX21",
  lead_email: "rahul@example.com",
  lead_kind: "Student",
  lead_city: "Pune",
};
const fill = (s: string, v: Record<string, string>) => s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => v[k] ?? `{{${k}}}`);

/* Inline **bold** and [label](url), for the preview only. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*.+?\*\*|\[[^\]]+\]\([^)\s]+\))/g);
  return (
    <>
      {parts.map((p, i) => {
        const b = p.match(/^\*\*(.+)\*\*$/);
        if (b) return <strong key={i}>{b[1]}</strong>;
        const l = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
        if (l) return <a key={i} href={l[2]} target="_blank" rel="noreferrer" className="font-semibold text-go-deep underline">{l[1]}</a>;
        return (
          <Fragment key={i}>
            {p.split("\n").map((line, j, arr) => (
              <Fragment key={j}>
                {line}
                {j < arr.length - 1 && <br />}
              </Fragment>
            ))}
          </Fragment>
        );
      })}
    </>
  );
}

/** Close copy of how the email looks, built from the same simple rules as the sender. */
function EmailPreview({ subject, body }: { subject: string; body: string }) {
  const blocks = body.split(/\n\s*\n/).filter((b) => b.trim());
  const render = (b: string, key: string): React.ReactNode => {
    const line = b.trim();
    if (/^\{\{\s*code\s*\}\}$/.test(line)) return <p key={key} className="readout my-3 inline-block rounded-xl border border-[#bfe6cc] bg-go-soft px-5 py-3 text-2xl font-bold tracking-[0.3em]">{SAMPLE.code}</p>;
    const btn = line.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (btn) return <p key={key} className="my-3"><span className="inline-block rounded-lg bg-go-deep px-4 py-2.5 text-[0.95rem] font-bold text-white">{fill(btn[1], SAMPLE)}</span></p>;
    const solo = line.match(/^\{\{\s*(body|reply|message)\s*\}\}$/);
    if (solo) return <Fragment key={key}>{SAMPLE[solo[1]].split(/\n\s*\n/).map((x, i) => render(x, `${key}-${i}`))}</Fragment>;
    return <p key={key} className="mb-3"><Inline text={fill(line, SAMPLE)} /></p>;
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="border-b border-line bg-mist px-4 py-2.5 text-sm">
        <span className="text-ink2">Subject: </span>
        <strong>{fill(subject, SAMPLE)}</strong>
      </div>
      <div className="border-b-[3px] border-go px-5 py-3 text-sm font-semibold">GRAAS</div>
      <div className="px-5 py-4 text-[0.95rem] leading-relaxed">{blocks.map((b, i) => render(b, String(i)))}</div>
    </div>
  );
}

const WA_TONE: Record<string, Tone> = { APPROVED: "good", PENDING: "warn", IN_APPEAL: "warn", REJECTED: "bad", PAUSED: "bad", DISABLED: "bad" };
const WA_LABEL: Record<string, string> = { APPROVED: "Approved", PENDING: "Waiting for Meta", IN_APPEAL: "In appeal", REJECTED: "Rejected by Meta", PAUSED: "Paused by Meta", DISABLED: "Disabled by Meta", NOT_SUBMITTED: "Not submitted" };

/* ------------------------------------------------------------------------------------------------------------- */
/* Settings: Brevo email, Meta WhatsApp, verification rules, alerts and reminders                                 */
/* ------------------------------------------------------------------------------------------------------------- */
function Settings({ s, reload }: { s: any; reload: () => void }) {
  const can = !!s.can_edit_keys;
  const [msg, setMsg] = useState<{ tone: Tone; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [emailOn, setEmailOn] = useState(!!s.email?.enabled);
  const [waOn, setWaOn] = useState(!!s.whatsapp?.enabled);
  const [testTo, setTestTo] = useState("");
  const [waTestTo, setWaTestTo] = useState("");
  const [sync, setSync] = useState<any>(null);
  const [ask, setAsk] = useState<"" | "email" | "whatsapp">("");

  async function setMessaging(p: any, ok: string) {
    setBusy(true);
    setMsg(null);
    const { data, error } = await sb().rpc("staff_set_messaging", { p });
    setBusy(false);
    if (error || !data?.ok) {
      setMsg({ tone: "bad", text: data?.error ?? error?.message ?? "Could not save." });
      return false;
    }
    setMsg({ tone: "good", text: ok });
    reload();
    return true;
  }
  async function saveEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const ok = await setMessaging(
      { email: { enabled: emailOn, sender_name: f.get("sender_name"), sender_email: f.get("sender_email"), reply_to: f.get("reply_to"), api_key: f.get("api_key") } },
      emailOn ? "Saved. Email is on. Send a test to check that it arrives." : "Saved. Email stays off until you tick Email sending is on.",
    );
    if (ok) (form.elements.namedItem("api_key") as HTMLInputElement).value = "";
  }
  async function saveWa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const ok = await setMessaging(
      { whatsapp: { enabled: waOn, phone_number_id: f.get("phone_number_id"), waba_id: f.get("waba_id"), display_phone: f.get("display_phone"), api_version: f.get("api_version"), token: f.get("token") } },
      "Saved. Press Check with Meta to confirm the number and see which templates are approved.",
    );
    if (ok) (form.elements.namedItem("token") as HTMLInputElement).value = "";
  }
  async function saveRules(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const days = String(f.get("reminder_days") ?? "")
      .split(/[^0-9]+/)
      .filter(Boolean)
      .map(Number);
    await setMessaging(
      {
        verify: { email_required: f.get("email_required") === "on", phone_required: f.get("phone_required") === "on" },
        alerts_email: f.get("alerts_email"),
        reminder_days: days,
        expired_notice: f.get("expired_notice") === "on",
      },
      "Saved.",
    );
  }
  async function test(channel: "email" | "whatsapp") {
    setBusy(true);
    setMsg(null);
    const r = await portal("msg_test", { channel, to: channel === "email" ? testTo : waTestTo });
    setBusy(false);
    setMsg(r.ok ? { tone: "good", text: channel === "email" ? `Test email sent to ${testTo}. Check the inbox, and the Spam folder.` : "WhatsApp test sent. It should arrive in a few seconds." } : { tone: "bad", text: r.error ?? "The test was not sent." });
    reload();
  }
  async function metaSync(create: boolean) {
    setBusy(true);
    setMsg(null);
    const r = await portal("wa_sync", { create });
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "bad", text: r.error ?? "Meta could not be reached." });
    setSync(r);
    const created = (r.created as string[]) ?? [];
    const errors = (r.errors as string[]) ?? [];
    setMsg(errors.length ? { tone: "bad", text: `Some templates were not accepted: ${errors.join("; ")}` } : { tone: "good", text: create ? (created.length ? `Sent ${created.length} templates to Meta for approval. Approval usually takes from a few minutes to a day.` : "All templates were already with Meta.") : "Checked with Meta." });
    reload();
  }
  async function clear(kind: "email" | "whatsapp") {
    setAsk("");
    await setMessaging(kind === "email" ? { email: { enabled: false, clear_key: true } } : { whatsapp: { enabled: false, clear_token: true } }, kind === "email" ? "Brevo key removed and email switched off." : "WhatsApp token removed and WhatsApp switched off.");
  }

  const e = s.email ?? {};
  const w = s.whatsapp ?? {};
  const v = s.verify ?? {};
  const st = s.stats ?? {};
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Email" value={s.email_ready ? "On" : "Off"} note={s.email_ready ? `From ${e.sender_email}` : s.has_brevo_key ? "Key saved, switched off" : "Brevo key needed"} tone={s.email_ready ? "good" : "warn"} />
        <Stat label="WhatsApp" value={w.enabled ? "On" : "Off"} note={s.wa_codes_ready ? "Codes and updates working" : w.enabled ? "Waiting for template approval" : "Meta setup needed"} tone={s.wa_codes_ready ? "good" : "warn"} />
        <Stat label="Sent in the last 24 hours" value={st.sent_24h ?? 0} note={st.failed_24h ? `${st.failed_24h} failed` : st.skipped_24h ? `${st.skipped_24h} not sent, channel off` : "No failures"} tone={st.failed_24h ? "bad" : st.skipped_24h ? "warn" : "good"} />
        <Stat label="Confirmed emails" value={`${st.email_verified ?? 0} of ${st.accounts ?? 0}`} note={`${st.phone_verified ?? 0} WhatsApp numbers confirmed`} />
      </div>
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
      {!can && <Msg tone="plain">Only a super admin can change these settings. You can see them, read the sent messages and edit wording if your role allows.</Msg>}

      <form onSubmit={saveEmail} className="plate grid gap-4 p-5 sm:p-6" autoComplete="off">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-semibold">Email, through Brevo</h3>
          <Badge tone={s.email_ready ? "good" : "warn"}>{s.email_ready ? "Sending" : "Not sending"}</Badge>
        </div>
        <p className="text-sm text-ink2">
          graas.org.in is already verified in Brevo, so mail from an @graas.org.in address reaches inboxes. To get the key: in Brevo open the account menu, then SMTP and API, then the API keys tab, and press Generate a new API key. Name it GRAAS website, copy it, and paste it here yourself. It is stored where nobody can read it back.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={lbl}>
            Sender name
            <input name="sender_name" className="field" defaultValue={e.sender_name ?? "GRAAS"} maxLength={60} disabled={!can} />
          </label>
          <label className={lbl}>
            Sender address
            <input name="sender_email" className="field" type="email" defaultValue={e.sender_email ?? ""} placeholder="no-reply@graas.org.in" disabled={!can} />
          </label>
          <label className={lbl}>
            Replies go to
            <input name="reply_to" className="field" type="email" defaultValue={e.reply_to ?? ""} placeholder="connect@graas.org.in" disabled={!can} />
          </label>
          <label className={lbl}>
            Brevo API key
            <input name="api_key" type="password" className="field" placeholder={s.has_brevo_key ? "Saved. Paste a new key to replace it" : "xkeysib-…"} autoComplete="new-password" disabled={!can} />
          </label>
        </div>
        <label className="flex items-center gap-2.5 font-semibold">
          <input type="checkbox" className="h-5 w-5 accent-[#067a2e]" checked={emailOn} onChange={(x) => setEmailOn(x.target.checked)} disabled={!can} />
          Email sending is on
        </label>
        {can && (
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-go !min-h-10 !py-2" disabled={busy}>
              Save email settings
            </button>
            {ask === "email" ? (
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                Remove the Brevo key and stop all email?
                <button type="button" className={small} onClick={() => clear("email")}>
                  Yes, remove
                </button>
                <button type="button" className={small} onClick={() => setAsk("")}>
                  Keep
                </button>
              </span>
            ) : (
              s.has_brevo_key && (
                <button type="button" className="btn btn-quiet !min-h-10 !py-2" onClick={() => setAsk("email")}>
                  Remove key
                </button>
              )
            )}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
          <label className={`${lbl} min-w-64 flex-1`}>
            Send a test email to
            <input className="field" type="email" value={testTo} onChange={(x) => setTestTo(x.target.value)} placeholder="you@example.com" />
          </label>
          <button type="button" className="btn btn-quiet !min-h-11" onClick={() => test("email")} disabled={busy || !testTo || !s.has_brevo_key}>
            Send test
          </button>
        </div>
      </form>

      <form onSubmit={saveWa} className="plate grid gap-4 p-5 sm:p-6" autoComplete="off">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-semibold">WhatsApp, through Meta</h3>
          <Badge tone={s.wa_codes_ready ? "good" : "warn"}>{s.wa_codes_ready ? "Sending" : w.enabled ? "Waiting for approval" : "Not set up"}</Badge>
        </div>
        <ol className="grid list-decimal gap-1.5 pl-5 text-sm text-ink2">
          <li>At business.facebook.com, open WhatsApp Manager and add GRAAS&apos;s number. The number must not be on the WhatsApp app. Meta verifies it with an SMS or call.</li>
          <li>Add a payment method in WhatsApp Manager. Codes and account updates cost about ₹0.12 each; news costs about ₹0.86 each.</li>
          <li>In Business settings, create a system user with full control of the WhatsApp account, and generate a permanent access token with the whatsapp_business_messaging and whatsapp_business_management permissions.</li>
          <li>Paste the Phone number ID, the WhatsApp Business Account ID and the token below, tick WhatsApp is on, and save.</li>
          <li>Press Submit templates to Meta. When Meta approves them, codes and updates start going out on WhatsApp by themselves.</li>
        </ol>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={lbl}>
            Phone number ID
            <input name="phone_number_id" className="field readout" inputMode="numeric" defaultValue={w.phone_number_id ?? ""} disabled={!can} />
          </label>
          <label className={lbl}>
            WhatsApp Business Account ID
            <input name="waba_id" className="field readout" inputMode="numeric" defaultValue={w.waba_id ?? ""} disabled={!can} />
          </label>
          <label className={lbl}>
            Number members see
            <input name="display_phone" className="field" defaultValue={w.display_phone ?? ""} placeholder="+91 …" disabled={!can} />
          </label>
          <label className={lbl}>
            Graph API version
            <input name="api_version" className="field readout" defaultValue={w.api_version ?? "v25.0"} disabled={!can} />
          </label>
          <label className={`${lbl} md:col-span-2`}>
            Permanent access token
            <input name="token" type="password" className="field" placeholder={s.has_wa_token ? "Saved. Paste a new token to replace it" : "Paste the system user token"} autoComplete="new-password" disabled={!can} />
          </label>
        </div>
        <label className="flex items-center gap-2.5 font-semibold">
          <input type="checkbox" className="h-5 w-5 accent-[#067a2e]" checked={waOn} onChange={(x) => setWaOn(x.target.checked)} disabled={!can} />
          WhatsApp is on
        </label>
        {can && (
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-go !min-h-10 !py-2" disabled={busy}>
              Save WhatsApp settings
            </button>
            <button type="button" className="btn btn-quiet !min-h-10 !py-2" onClick={() => metaSync(false)} disabled={busy || !s.has_wa_token}>
              Check with Meta
            </button>
            <button type="button" className="btn btn-quiet !min-h-10 !py-2" onClick={() => metaSync(true)} disabled={busy || !s.has_wa_token}>
              Submit templates to Meta
            </button>
            {ask === "whatsapp" ? (
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                Remove the token and stop WhatsApp?
                <button type="button" className={small} onClick={() => clear("whatsapp")}>
                  Yes, remove
                </button>
                <button type="button" className={small} onClick={() => setAsk("")}>
                  Keep
                </button>
              </span>
            ) : (
              s.has_wa_token && (
                <button type="button" className="btn btn-quiet !min-h-10 !py-2" onClick={() => setAsk("whatsapp")}>
                  Remove token
                </button>
              )
            )}
          </div>
        )}
        {sync?.phone && (
          <div className="rounded-xl bg-cobalt-soft p-4 text-sm">
            {sync.phone.error ? (
              <p className="font-semibold text-[#8f1a11]">Number check: {sync.phone.error}</p>
            ) : (
              <p>
                <strong>{sync.phone.verified_name ?? "Name not set"}</strong>, {sync.phone.display_phone_number}. Name review: {String(sync.phone.name_status ?? "unknown").toLowerCase().replace(/_/g, " ")}. Quality: {String(sync.phone.quality_rating ?? "unknown").toLowerCase()}. Daily limit: {String(sync.phone.messaging_limit_tier ?? "not set").replace("TIER_", "").toLowerCase()}.
              </p>
            )}
          </div>
        )}
        {sync?.statuses && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {(sync.statuses as any[]).map((t) => (
              <li key={t.name} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                <span className="readout">{t.name}</span>
                <Badge tone={WA_TONE[t.status] ?? "plain"}>{WA_LABEL[t.status] ?? t.status}</Badge>
                {t.reason && <span className="w-full text-xs text-[#8f1a11]">{t.reason}</span>}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
          <label className={`${lbl} min-w-64 flex-1`}>
            Send Meta&apos;s hello_world test to
            <input className="field" type="tel" inputMode="numeric" value={waTestTo} onChange={(x) => setWaTestTo(x.target.value)} placeholder="10-digit mobile number" />
          </label>
          <button type="button" className="btn btn-quiet !min-h-11" onClick={() => test("whatsapp")} disabled={busy || !waTestTo || !s.has_wa_token}>
            Send test
          </button>
        </div>
      </form>

      <form onSubmit={saveRules} className="plate grid gap-4 p-5 sm:p-6">
        <h3 className="text-xl font-semibold">Rules, staff alerts and reminders</h3>
        <label className="flex items-start gap-2.5">
          <input name="email_required" type="checkbox" className="mt-0.5 h-5 w-5 accent-[#067a2e]" defaultChecked={v.email_required !== false} disabled={!can} />
          <span>
            <span className="font-semibold">Members must confirm their email before paying</span>
            <span className="block text-sm text-ink2">Works only while email is on. Recommended, so receipts and reminders reach a real inbox.</span>
          </span>
        </label>
        <label className="flex items-start gap-2.5">
          <input name="phone_required" type="checkbox" className="mt-0.5 h-5 w-5 accent-[#067a2e]" defaultChecked={!!v.phone_required} disabled={!can} />
          <span>
            <span className="font-semibold">Members must confirm their WhatsApp number before paying</span>
            <span className="block text-sm text-ink2">Works only once WhatsApp codes are approved. Leave off unless you need every member on WhatsApp.</span>
          </span>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={lbl}>
            Staff alerts go to
            <input name="alerts_email" className="field" defaultValue={s.alerts_email ?? ""} placeholder="connect@graas.org.in" disabled={!can} />
            <span className="text-sm font-normal text-ink2">New applications, payments, refunds, help requests and enquiries. Separate several addresses with commas.</span>
          </label>
          <label className={lbl}>
            Renewal reminders, days before the end date
            <input name="reminder_days" className="field readout" defaultValue={(s.reminder_days ?? [30, 7, 1]).join(", ")} disabled={!can} />
            <span className="text-sm font-normal text-ink2">Sent at about 9:15 in the morning, India time.</span>
          </label>
        </div>
        <label className="flex items-center gap-2.5 font-semibold">
          <input name="expired_notice" type="checkbox" className="h-5 w-5 accent-[#067a2e]" defaultChecked={s.expired_notice !== false} disabled={!can} />
          Tell members the day after their membership ends
        </label>
        {can && (
          <button className="btn btn-go justify-self-start !min-h-10 !py-2" disabled={busy}>
            Save rules
          </button>
        )}
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------------------- */
/* Wording: every message, its channels, and the email text                                                       */
/* ------------------------------------------------------------------------------------------------------------- */
function Wording({ canEdit }: { canEdit: boolean }) {
  const [rows, setRows] = useState<Template[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ subject: string; body: string }>({ subject: "", body: "" });
  const [msg, setMsg] = useState<{ tone: Tone; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await sb().from("message_templates").select("*").order("sort").order("channel");
    setRows((data ?? []) as Template[]);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const events = useMemo(() => {
    const map = new Map<string, { email?: Template; whatsapp?: Template }>();
    for (const r of rows ?? []) {
      if (r.event === "test") continue;
      const e = map.get(r.event) ?? {};
      e[r.channel] = r;
      map.set(r.event, e);
    }
    return [...map.entries()];
  }, [rows]);

  async function toggle(t: Template) {
    setMsg(null);
    const { error } = await sb().from("message_templates").update({ enabled: !t.enabled }).eq("event", t.event).eq("channel", t.channel);
    if (error) return setMsg({ tone: "bad", text: error.message });
    load();
  }
  async function save(t: Template) {
    setMsg(null);
    if (!draft.subject.trim() || !draft.body.trim()) return setMsg({ tone: "bad", text: "The subject and the text cannot be empty." });
    const { error } = await sb().from("message_templates").update({ subject: draft.subject.trim(), body: draft.body.trim() }).eq("event", t.event).eq("channel", "email");
    if (error) return setMsg({ tone: "bad", text: error.message });
    setMsg({ tone: "good", text: `Saved. The next "${t.label}" email uses this wording.` });
    setOpen(null);
    load();
  }

  if (!rows) return <p className="text-ink2">Loading…</p>;
  const section = (aud: "member" | "staff") => events.filter(([, e]) => (e.email ?? e.whatsapp)!.audience === aud);
  const chip = (t: Template | undefined, ch: "email" | "whatsapp") => {
    if (!t) return <span className="text-sm text-slate5">Not used</span>;
    const status = ch === "whatsapp" ? (t.wa_status ?? "NOT_SUBMITTED") : null;
    return (
      <span className="flex flex-wrap items-center gap-2">
        <label className={`flex items-center gap-1.5 text-sm font-semibold ${t.locked || !canEdit ? "" : "cursor-pointer"}`}>
          <input type="checkbox" className="h-4 w-4 accent-[#067a2e]" checked={t.enabled} disabled={t.locked || !canEdit} onChange={() => toggle(t)} />
          {t.locked ? "Always on" : t.enabled ? "On" : "Off"}
        </label>
        {status && <Badge tone={WA_TONE[status] ?? "plain"}>{WA_LABEL[status] ?? status}</Badge>}
      </span>
    );
  };

  return (
    <div className="grid gap-6">
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
      <p className="max-w-3xl text-ink2">
        Each message goes out by itself when its event happens. Switch a channel off to stop it. You can change the email wording; WhatsApp wording is fixed by Meta&apos;s approval. Codes, password notices and email-change notices are always sent.
      </p>
      {(["member", "staff"] as const).map((aud) => (
        <div key={aud} className="plate overflow-hidden">
          <h3 className="border-b border-line px-5 py-3 text-lg font-semibold">{aud === "member" ? "To members" : "To the GRAAS team"}</h3>
          <ul className="divide-y divide-line">
            {section(aud).map(([event, e]) => {
              const t = (e.email ?? e.whatsapp)!;
              const isOpen = open === event;
              return (
                <li key={event} className="px-5 py-4">
                  <div className="grid items-start gap-3 md:grid-cols-[minmax(0,1.4fr)_10rem_14rem_auto]">
                    <div>
                      <p className="font-semibold">{t.label}</p>
                      {t.description && <p className="text-sm text-ink2">{t.description}</p>}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-ink2 md:hidden">Email</p>
                      {chip(e.email, "email")}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-ink2 md:hidden">WhatsApp</p>
                      {aud === "staff" ? <span className="text-sm text-slate5">Email only</span> : chip(e.whatsapp, "whatsapp")}
                    </div>
                    <div className="flex gap-2 md:justify-end">
                      {e.email && (
                        <button
                          type="button"
                          className={small}
                          aria-expanded={isOpen}
                          onClick={() => {
                            setMsg(null);
                            setOpen(isOpen ? null : event);
                            setDraft({ subject: e.email!.subject ?? "", body: e.email!.body });
                          }}
                        >
                          {isOpen ? "Close" : canEdit ? "Edit wording" : "See wording"}
                        </button>
                      )}
                    </div>
                  </div>
                  {isOpen && e.email && (
                    <div className="mt-4 grid gap-5 xl:grid-cols-2">
                      <div className="grid content-start gap-3">
                        <label className={lbl}>
                          Subject
                          <input className="field" value={draft.subject} onChange={(x) => setDraft((d) => ({ ...d, subject: x.target.value }))} maxLength={180} disabled={!canEdit} />
                        </label>
                        <label className={lbl}>
                          Text
                          <textarea className="field min-h-64 font-mono text-sm" value={draft.body} onChange={(x) => setDraft((d) => ({ ...d, body: x.target.value }))} maxLength={6000} disabled={!canEdit} />
                        </label>
                        <p className="text-sm text-ink2">
                          Words in double curly brackets, such as <span className="readout">{"{{name}}"}</span>, are filled in for each person; keep them as they are. A blank line starts a new paragraph. <span className="readout">**words**</span> makes bold text. A line on its own like <span className="readout">[Open my account]({"{{link}}"})</span> becomes a button.
                        </p>
                        {e.whatsapp && (
                          <p className="rounded-xl bg-cobalt-soft p-3 text-sm">
                            <span className="font-semibold">WhatsApp text, as approved by Meta:</span> {fill(e.whatsapp.body.replace(/\{\{(\d+)\}\}/g, (_, n) => `{{${e.whatsapp!.wa_params[Number(n) - 1] ?? n}}}`), SAMPLE)}
                          </p>
                        )}
                        {canEdit && (
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="btn btn-go !min-h-10 !py-2" onClick={() => save(e.email!)}>
                              Save wording
                            </button>
                            <button type="button" className="btn btn-quiet !min-h-10 !py-2" onClick={() => setOpen(null)}>
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="grid content-start gap-2">
                        <p className="text-sm font-semibold text-ink2">Preview with sample details</p>
                        <EmailPreview subject={draft.subject} body={draft.body} />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------------------- */
/* Sent messages                                                                                                   */
/* ------------------------------------------------------------------------------------------------------------- */
const STATUS_TONE: Record<string, Tone> = { sent: "good", queued: "warn", sending: "warn", failed: "bad", skipped: "plain" };
const STATUS_TEXT: Record<string, string> = { sent: "Sent", queued: "Waiting", sending: "Sending", failed: "Failed", skipped: "Not sent" };

function Log() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<{ tone: Tone; text: string } | null>(null);

  const load = useCallback(async () => {
    let query = sb().from("messages").select("id,created_at,event,channel,to_addr,status,attempts,subject,error,sent_at,user_id").order("created_at", { ascending: false }).limit(400);
    if (status) query = query.eq("status", status);
    if (channel) query = query.eq("channel", channel);
    const { data } = await query;
    setRows(data ?? []);
  }, [status, channel]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    sb()
      .from("message_templates")
      .select("event,label")
      .then(({ data }) => setLabels(Object.fromEntries((data ?? []).map((r: any) => [r.event, r.label]))));
  }, []);

  async function retry(id: string) {
    const { data } = await sb().rpc("staff_retry_message", { p_id: id });
    setMsg(data?.ok ? { tone: "good", text: "Queued again. It goes out within a minute or two." } : { tone: "bad", text: data?.error ?? "Could not queue it." });
    load();
  }

  const shown = (rows ?? []).filter((r) => !q.trim() || [r.to_addr, r.subject, labels[r.event], r.event].some((x) => String(x ?? "").toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className={lbl}>
          Search
          <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email, number or subject" />
        </label>
        <label className={lbl}>
          Status
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="sent">Sent</option>
            <option value="queued">Waiting</option>
            <option value="failed">Failed</option>
            <option value="skipped">Not sent, channel off</option>
          </select>
        </label>
        <label className={lbl}>
          Channel
          <select className="field" value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="">Both</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </label>
        <button type="button" className="btn btn-quiet !min-h-11" onClick={load}>
          Refresh
        </button>
      </div>
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
      {rows === null ? (
        <p className="text-ink2">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="plate p-5 text-ink2">No messages yet. They appear here as members sign up, pay and get updates.</p>
      ) : (
        <ul className="plate divide-y divide-line">
          {shown.map((r) => (
            <li key={r.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center">
              <span className="text-sm text-ink2">
                {shortDate(r.created_at)}, {new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{labels[r.event] ?? r.event}</span>
                <span className="block truncate text-sm text-ink2">
                  {r.channel === "whatsapp" ? "WhatsApp" : "Email"} to {r.channel === "whatsapp" ? `+${r.to_addr}` : r.to_addr}
                  {r.subject && r.channel === "email" ? `: ${r.subject}` : ""}
                </span>
                {r.error && <span className="block text-sm text-[#8f1a11]">{r.error}</span>}
              </span>
              <span className="flex items-center gap-2">
                <Badge tone={STATUS_TONE[r.status] ?? "plain"}>{STATUS_TEXT[r.status] ?? r.status}</Badge>
                {(r.status === "failed" || r.status === "skipped") && !String(r.event).startsWith("code_") && r.event !== "test" && (
                  <button type="button" className={small} onClick={() => retry(r.id)}>
                    Send again
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Messages({ role }: { role: string }) {
  const [view, setView] = useState("settings");
  const [s, setS] = useState<any>(null);
  const load = useCallback(async () => {
    const { data } = await sb().rpc("staff_messaging");
    setS(data ?? {});
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const canWord = role === "super_admin" || role === "communications";
  return (
    <div className="grid max-w-6xl gap-6">
      <div role="tablist" aria-label="Messages" className="flex gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-[var(--shadow-card)] sm:inline-flex sm:justify-self-start">
        {[
          ["settings", "Email and WhatsApp"],
          ["wording", "Messages and wording"],
          ["log", "Sent messages"],
        ].map(([id, label]) => (
          <button key={id} role="tab" type="button" aria-selected={view === id} onClick={() => setView(id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-[0.95rem] font-semibold ${view === id ? "bg-ink text-white" : "text-ink2 hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>
      {view === "settings" && (s ? <Settings key={JSON.stringify(s)} s={s} reload={load} /> : <p className="text-ink2">Loading…</p>)}
      {view === "wording" && <Wording canEdit={canWord} />}
      {view === "log" && <Log />}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------------------- */
/* Send an update to members                                                                                       */
/* ------------------------------------------------------------------------------------------------------------- */
const AUDIENCES: [string, string][] = [
  ["active", "Active members"],
  ["applicants", "Applicants who have not finished"],
  ["expiring", "Members whose membership ends within 30 days"],
  ["expired", "Members whose membership has ended"],
  ["all", "Everyone with an account"],
];

export function Broadcast({ prefill, onSent }: { prefill?: { subject: string; body: string } | null; onSent?: () => void }) {
  const [aud, setAud] = useState("active");
  const [subject, setSubject] = useState(prefill?.subject ?? "");
  const [body, setBody] = useState(prefill?.body ?? "");
  const [wa, setWa] = useState(false);
  const [d, setD] = useState<any>(null);
  const [s, setS] = useState<any>(null);
  const [waOk, setWaOk] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: Tone; text: string } | null>(null);

  useEffect(() => {
    sb()
      .rpc("staff_dashboard")
      .then(({ data }) => setD(data));
    sb()
      .rpc("staff_messaging")
      .then(({ data }) => setS(data));
    sb()
      .from("message_templates")
      .select("enabled,wa_status")
      .eq("event", "broadcast")
      .eq("channel", "whatsapp")
      .maybeSingle()
      .then(({ data }) => setWaOk(!!data?.enabled && data?.wa_status === "APPROVED"));
  }, []);

  const count = d ? ({ active: d.active, applicants: d.pending_approval + d.pending_payment, expiring: d.expiring_30, expired: d.expired, all: d.accounts } as Record<string, number>)[aud] : null;

  async function send() {
    setBusy(true);
    setMsg(null);
    const { data, error } = await sb().rpc("staff_broadcast", { p_audience: aud, p_subject: subject, p_body: body, p_whatsapp: wa && waOk });
    setBusy(false);
    setConfirm(false);
    if (error || !data?.ok) return setMsg({ tone: "bad", text: data?.error ?? error?.message ?? "Could not send." });
    setMsg({
      tone: "good",
      text: data.messages ? `Queued ${data.messages} messages. They go out over the next few minutes; follow them under Messages, Sent messages.` : "Nobody in that group can receive it right now, or email is switched off.",
    });
    setSubject("");
    setBody("");
    onSent?.();
  }

  return (
    <div className="grid max-w-6xl gap-6">
      {s && !s.email_ready && <Msg tone="warn">Email is switched off, so updates are recorded but not sent. Switch it on under Messages first.</Msg>}
      <div className="grid gap-6 xl:grid-cols-2">
        <form
          className="plate grid content-start gap-4 p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (subject.trim().length < 4 || body.trim().length < 10) return setMsg({ tone: "bad", text: "Write a subject and a message." });
            setMsg(null);
            setConfirm(true);
          }}
        >
          <h3 className="text-xl font-semibold">Write the update</h3>
          <label className={lbl}>
            Who gets it
            <select className="field" value={aud} onChange={(e) => setAud(e.target.value)}>
              {AUDIENCES.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            {count !== null && <span className="text-sm font-normal text-ink2">About {count} {count === 1 ? "person" : "people"}. Members who switched off news are left out. Staff accounts are left out.</span>}
          </label>
          <label className={lbl}>
            Subject
            <input className="field" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} />
          </label>
          <label className={lbl}>
            Message
            <textarea className="field min-h-56" value={body} onChange={(e) => setBody(e.target.value)} maxLength={8000} placeholder={"Hi everyone,\n\nWrite the update here.\n\n[Read more](https://graas.org.in/updates)"} />
            <span className="text-sm font-normal text-ink2">A blank line starts a new paragraph. **words** makes bold text. A line on its own like [Register](https://…) becomes a button.</span>
          </label>
          <label className={`flex items-start gap-2.5 ${waOk ? "" : "opacity-60"}`}>
            <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[#067a2e]" checked={wa && waOk} disabled={!waOk} onChange={(e) => setWa(e.target.checked)} />
            <span>
              <span className="font-semibold">Also send a short WhatsApp note</span>
              <span className="block text-sm text-ink2">{waOk ? "Goes only to members who confirmed their number and kept WhatsApp updates on. About ₹0.86 per message." : "Needs the News and updates WhatsApp template switched on and approved by Meta."}</span>
            </span>
          </label>
          {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
          {confirm ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#fff4e5] p-3 text-sm font-semibold text-[#8a4b00]">
              Send this to about {count ?? "all"} {count === 1 ? "person" : "people"}? It cannot be recalled.
              <button type="button" className="btn btn-go !min-h-9 !py-1" onClick={send} disabled={busy}>
                {busy ? "Sending…" : "Yes, send"}
              </button>
              <button type="button" className={small} onClick={() => setConfirm(false)}>
                Not yet
              </button>
            </div>
          ) : (
            <button className="btn btn-go justify-self-start !min-h-10 !py-2">Send update</button>
          )}
        </form>
        <div className="grid content-start gap-2">
          <p className="text-sm font-semibold text-ink2">Preview</p>
          <EmailPreview subject={subject || "Subject"} body={body || "Your message appears here."} />
        </div>
      </div>
    </div>
  );
}
