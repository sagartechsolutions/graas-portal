// GRAAS WhatsApp webhook: Meta calls this address with delivery reports, messages people send to the GRAAS number,
// and news about templates and the account. Every POST is checked against the Meta app secret before anything is read.
// The database does the work (svc_wa_webhook); this function only checks, forwards and sends the short replies.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { graph, graphError, loadMessaging } from "../_shared/messaging.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
}
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const text = (body: string, status = 200) => new Response(body, { status, headers: { "content-type": "text/plain" } });

Deno.serve(async (req) => {
  // Meta checks the address once, when it is saved in the app: it must echo the challenge if the verify token matches.
  if (req.method === "GET") {
    const q = new URL(req.url).searchParams;
    const m = await loadMessaging(admin);
    const token = q.get("hub.verify_token") ?? "";
    const want = String(m.wa_verify_token ?? "");
    if (q.get("hub.mode") === "subscribe" && want && same(token, want)) return text(q.get("hub.challenge") ?? "");
    return text("Forbidden", 403);
  }
  if (req.method !== "POST") return text("Use POST.", 405);

  const raw = await req.text();
  const m = await loadMessaging(admin);
  const secret = String(m.wa_app_secret ?? "");
  // Without the app secret nothing can be trusted, so nothing is read.
  if (!secret) return text("Not set up", 403);
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  if (!same("sha256=" + (await hmac(secret, raw)), sig)) return text("Bad signature", 401);

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return text("ok");
  }
  if (body?.object !== "whatsapp_business_account") return text("ok");

  const r = await admin.rpc("svc_wa_webhook", { p: body });
  // A database error makes Meta send it again later; the database ignores anything it has already seen.
  if (r.error) return text("Try again", 500);

  const phoneId = m.whatsapp?.phone_number_id;
  for (const x of (r.data?.replies ?? []) as { wa_id: string; text: string; auto?: boolean }[]) {
    if (!m.wa_token || !phoneId) break;
    const g = await graph(m, "POST", `${phoneId}/messages`, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: x.wa_id,
      type: "text",
      text: { body: x.text, preview_url: false },
    });
    await admin.rpc("svc_wa_record_out", {
      p_wa: x.wa_id,
      p_body: x.text,
      p_provider: g.ok ? g.j?.messages?.[0]?.id ?? null : null,
      p_ok: g.ok,
      p_error: g.ok ? null : graphError(g),
      p_actor: null,
      p_auto: true,
    });
  }
  return text("ok");
});
