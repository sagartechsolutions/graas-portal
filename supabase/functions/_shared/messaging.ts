// Sends GRAAS messages: email through Brevo, WhatsApp through Meta's Cloud API.
// Templates and settings come from the database (svc_messaging). Secrets never leave this module's callers.
// deno-lint-ignore-file no-explicit-any

export const SITE = "https://graas.org.in";
const LOGO = `${SITE}/brand/graas-email-logo.png`;

export type Template = {
  event: string;
  channel: "email" | "whatsapp";
  audience: "member" | "staff";
  enabled: boolean;
  subject: string | null;
  body: string;
  wa_name: string | null;
  wa_lang: string;
  wa_category: string | null;
  wa_params: string[];
  wa_status: string | null;
};
export type Messaging = {
  email: { enabled: boolean; sender_name: string; sender_email: string; reply_to: string | null };
  whatsapp: { enabled: boolean; phone_number_id: string | null; waba_id: string | null; api_version: string };
  brevo_key: string | null;
  wa_token: string | null;
  notify_key: string | null;
  templates: Template[];
  [k: string]: any;
};
export type Sent = { ok: boolean; id?: string | null; error?: string; retry?: boolean; subject?: string | null };

export async function loadMessaging(admin: any): Promise<Messaging> {
  const r = await admin.rpc("svc_messaging");
  return (r.data ?? { email: {}, whatsapp: {}, templates: [] }) as Messaging;
}
export const emailReady = (m: Messaging) => !!(m.email?.enabled && m.brevo_key && m.email?.sender_email);
export const waReady = (m: Messaging) => !!(m.whatsapp?.enabled && m.wa_token && m.whatsapp?.phone_number_id);
export const template = (m: Messaging, event: string, channel: string) =>
  (m.templates ?? []).find((t) => t.event === event && t.channel === channel) ?? null;
export const waTemplateReady = (m: Messaging, event: string) => {
  const t = template(m, event, "whatsapp");
  return !!(waReady(m) && t?.enabled && t.wa_name && t.wa_status === "APPROVED");
};

/** Date and time in India, for "changed on …" lines. */
export const nowIST = () =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date());

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);
const PH = /\{\{\s*(\w+)\s*\}\}/g;

function baseVars(m: Messaging, vars: Record<string, unknown>) {
  const v: Record<string, string> = {};
  for (const [k, val] of Object.entries(vars ?? {})) v[k] = val == null ? "" : String(val);
  v.site ??= SITE;
  v.org ??= "GRAAS";
  v.support_email ??= m.email?.reply_to || "connect@graas.org.in";
  v.when ??= nowIST();
  v.name ||= "there";
  return v;
}
export const fill = (t: string, v: Record<string, string>) => t.replace(PH, (_, k) => v[k] ?? "");

/** Inline formatting on already-escaped text: **bold** and [label](url). */
const inline = (s: string) =>
  s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" style="color:#067a2e;font-weight:bold">$1</a>');

/** Puts escaped values into placeholders. Multi-line values keep their line breaks. */
const fillHtml = (s: string, v: Record<string, string>, rich = false) =>
  s.replace(PH, (_, k) => {
    const raw = v[k] ?? "";
    const e = esc(raw);
    return (rich ? inline(e) : e).replace(/\r?\n/g, "<br>");
  });

const P = 'style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1d2430"';

function blockHtml(block: string, v: Record<string, string>): string {
  const line = block.trim();
  if (/^\{\{\s*code\s*\}\}$/.test(line)) {
    return `<p style="margin:6px 0 22px"><span style="display:inline-block;padding:14px 22px;border-radius:12px;background:#e7f6ec;border:1px solid #bfe6cc;font-family:'Courier New',monospace;font-size:30px;letter-spacing:8px;font-weight:bold;color:#000e21">${esc(v.code ?? "")}</span></p>`;
  }
  const btn = line.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
  if (btn) {
    const href = fillHtml(esc(btn[2]), v);
    return `<p style="margin:8px 0 22px"><a href="${href}" style="display:inline-block;background:#067a2e;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px;border-radius:10px">${fillHtml(esc(btn[1]), v)}</a></p>`;
  }
  const solo = line.match(/^\{\{\s*(body|reply|message)\s*\}\}$/);
  if (solo) {
    const raw = v[solo[1]] ?? "";
    const rich = solo[1] === "body";
    return raw
      .split(/\r?\n\s*\r?\n/)
      .filter((x) => x.trim())
      .map((para) => {
        const b = para.trim().match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
        if (rich && b) return blockHtml(para, v);
        const e = esc(para.trim());
        return `<p ${P}>${(rich ? inline(e) : e).replace(/\r?\n/g, "<br>")}</p>`;
      })
      .join("");
  }
  return `<p ${P}>${fillHtml(inline(esc(line)), v).replace(/\r?\n/g, "<br>")}</p>`;
}

function layout(content: string, footer: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f6f8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border:1px solid #e2e4e9;border-radius:16px;font-family:Arial,Helvetica,sans-serif">
<tr><td style="padding:22px 30px 18px;border-bottom:3px solid #02ae3e">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle"><img src="${LOGO}" width="52" height="44" alt="GRAAS" style="display:block;border:0"></td>
<td style="vertical-align:middle;padding-left:12px;font-size:13px;line-height:1.35;color:#4a515c"><strong style="font-size:15px;color:#000e21">GRAAS</strong><br>Global Robotics And Automation Society</td>
</tr></table></td></tr>
<tr><td style="padding:28px 30px 12px">${content}</td></tr>
<tr><td style="padding:18px 30px 22px;background:#f5f6f8;border-radius:0 0 16px 16px;font-size:12.5px;line-height:1.6;color:#5a616b">
<a href="${SITE}" style="color:#067a2e;text-decoration:none;font-weight:bold">graas.org.in</a>${footer ? `<br>${footer}` : ""}</td></tr>
</table></td></tr></table></body></html>`;
}

function footerFor(t: Template) {
  if (t.audience === "staff") return "Staff alert from the GRAAS website. Change where alerts go in Admin, under Messages.";
  if (t.event === "broadcast") return "You get GRAAS news because you have an account with us. To stop it, switch off News and updates in your account.";
  if (t.event.startsWith("code_")) return "Never share this code. GRAAS staff will never ask you for it.";
  return "This message is about your GRAAS account. Reply to this email if you need help.";
}

export function renderEmail(m: Messaging, t: Template, vars: Record<string, unknown>) {
  const v = baseVars(m, vars);
  const subject = fill(t.subject ?? "GRAAS", v).replace(/\s+/g, " ").trim().slice(0, 180);
  const blocks = t.body.split(/\r?\n\s*\r?\n/).filter((b) => b.trim());
  const html = layout(blocks.map((b) => blockHtml(b, v)).join(""), esc(footerFor(t)));
  const text =
    fill(t.body, v)
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1: $2") +
    `\n\n--\nGRAAS, Global Robotics And Automation Society\n${SITE}\n${footerFor(t)}`;
  return { subject, html, text };
}

export async function sendEmail(m: Messaging, to: string, subject: string, html: string, text: string, tag: string): Promise<Sent> {
  if (!emailReady(m)) return { ok: false, error: "Email sending is switched off in Admin.", retry: false };
  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": m.brevo_key!, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: m.email.sender_name || "GRAAS", email: m.email.sender_email },
        to: [{ email: to }],
        ...(m.email.reply_to ? { replyTo: { email: m.email.reply_to } } : {}),
        subject,
        htmlContent: html,
        textContent: text,
        tags: [tag],
      }),
    });
    const j: any = await r.json().catch(() => ({}));
    if (r.ok) return { ok: true, id: j.messageId ?? null, subject };
    const why = r.status === 401 ? "Brevo rejected the API key." : j.message ? `Brevo: ${j.message}` : `Brevo answered with error ${r.status}.`;
    return { ok: false, error: why, retry: r.status >= 500 || r.status === 429, subject };
  } catch (_e) {
    return { ok: false, error: "Brevo could not be reached.", retry: true, subject };
  }
}

/** WhatsApp template parameters: one line, no tabs or long runs of spaces, never empty. */
const waText = (s: unknown) =>
  String(s ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/ {4,}/g, "   ")
    .trim()
    .slice(0, 900) || "-";

export async function graph(m: Messaging, method: string, path: string, body?: unknown) {
  try {
    const r = await fetch(`https://graph.facebook.com/${m.whatsapp?.api_version || "v25.0"}/${path}`, {
      method,
      headers: { authorization: `Bearer ${m.wa_token}`, "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j: any = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, j };
  } catch (_e) {
    return { ok: false, status: 0, j: {} as any };
  }
}
export const graphError = (r: { status: number; j: any }) =>
  r.j?.error?.error_user_msg ?? r.j?.error?.message ?? (r.status ? `Meta answered with error ${r.status}.` : "Meta could not be reached.");

export async function sendWhatsApp(m: Messaging, t: Template, to: string, vars: Record<string, unknown>): Promise<Sent> {
  if (!waReady(m)) return { ok: false, error: "WhatsApp sending is switched off in Admin.", retry: false };
  if (!t.wa_name || t.wa_status !== "APPROVED") return { ok: false, error: "This WhatsApp template is not approved by Meta yet.", retry: false };
  const v = baseVars(m, vars);
  const components: any[] = [];
  if (t.wa_category === "AUTHENTICATION") {
    components.push(
      { type: "body", parameters: [{ type: "text", text: v.code }] },
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: v.code }] },
    );
  } else if (t.wa_params?.length) {
    components.push({ type: "body", parameters: t.wa_params.map((k) => ({ type: "text", text: waText(v[k]) })) });
  }
  const r = await graph(m, "POST", `${m.whatsapp.phone_number_id}/messages`, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/\D/g, ""),
    type: "template",
    template: { name: t.wa_name, language: { code: t.wa_lang || "en" }, components },
  });
  if (r.ok) return { ok: true, id: r.j?.messages?.[0]?.id ?? null, subject: t.wa_name };
  const code = r.j?.error?.code;
  return { ok: false, error: graphError(r), retry: r.status === 0 || r.status >= 500 || code === 130429 || code === 131000, subject: t.wa_name };
}

/** Renders and sends one message. Codes and tests come through here directly; queued messages through `notify`. */
export async function deliver(m: Messaging, event: string, channel: string, to: string, vars: Record<string, unknown>): Promise<Sent> {
  const t = template(m, event, channel);
  if (!t) return { ok: false, error: `No ${channel} wording is set up for "${event}".`, retry: false };
  if (channel === "email") {
    const e = renderEmail(m, t, vars);
    return await sendEmail(m, to, e.subject, e.html, e.text, event);
  }
  return await sendWhatsApp(m, t, to, vars);
}

/** Sample values Meta needs when a template is submitted for approval. */
const SAMPLES: Record<string, string> = {
  name: "Asha",
  plan: "Student Membership",
  amount: "₹590",
  member_no: "GRAAS-STU-26-00001",
  valid_till: "31 Mar 2027",
  receipt_no: "GRAAS/2026-27/00001",
  topic: "membership application",
  subject: "Registrations open for the GRAAS robotics workshop",
  code: "123456",
};

/** The request that submits a template row to Meta. Rows that share a wa_name are submitted once. */
export function metaTemplate(t: Template) {
  if (t.wa_category === "AUTHENTICATION") {
    return {
      name: t.wa_name,
      language: t.wa_lang || "en",
      category: "AUTHENTICATION",
      components: [
        { type: "BODY", add_security_recommendation: true },
        { type: "FOOTER", code_expiration_minutes: 10 },
        { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE", text: "Copy code" }] },
      ],
    };
  }
  return {
    name: t.wa_name,
    language: t.wa_lang || "en",
    category: t.wa_category || "UTILITY",
    components: [
      { type: "BODY", text: t.body, ...(t.wa_params.length ? { example: { body_text: [t.wa_params.map((k) => SAMPLES[k] ?? "sample")] } } : {}) },
      { type: "FOOTER", text: "GRAAS, Global Robotics And Automation Society" },
    ],
  };
}
