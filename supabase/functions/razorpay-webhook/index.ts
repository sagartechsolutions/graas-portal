// Razorpay webhook for GRAAS. Razorpay calls this address after a payment or refund.
// A notice is accepted only if its signature matches the webhook secret saved in Admin, Payment gateway.
// Each notice is handled once, and activating a membership is safe to repeat.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false, autoRefreshToken: false } });

async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const reply = (status: number, body: string) => new Response(body, { status, headers: { "content-type": "text/plain" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply(200, "GRAAS payment webhook");
  const raw = await req.text();
  const secret: string | null = ((await admin.rpc("svc_gateway")).data as any)?.webhook_secret ?? null;
  if (!secret) return reply(503, "webhook secret not set");
  if (!same(await hmac(secret, raw), req.headers.get("x-razorpay-signature") ?? "")) return reply(400, "bad signature");

  let ev: any;
  try {
    ev = JSON.parse(raw);
  } catch {
    return reply(400, "bad body");
  }
  const pay = ev?.payload?.payment?.entity ?? null;
  const ord = ev?.payload?.order?.entity ?? null;
  const ref = ev?.payload?.refund?.entity ?? null;
  const orderId: string | null = pay?.order_id ?? ord?.id ?? null;
  const eventId = req.headers.get("x-razorpay-event-id") ?? `${ev?.event}:${pay?.id ?? ref?.id ?? orderId}:${ev?.created_at}`;

  // Keep only what is needed to trace a payment. No card or contact details are stored.
  const kept = {
    payment: pay && { id: pay.id, order_id: pay.order_id, amount: pay.amount, status: pay.status, method: pay.method, error: pay.error_description ?? null },
    refund: ref && { id: ref.id, payment_id: ref.payment_id, amount: ref.amount, status: ref.status },
  };
  const fresh = await admin.rpc("svc_log_event", { p_event_id: eventId, p_event: String(ev?.event ?? "unknown"), p_rzp_order: orderId, p_rzp_payment: pay?.id ?? ref?.payment_id ?? null, p_payload: kept });
  if (fresh.error) return reply(500, "could not record");
  if (fresh.data === false) return reply(200, "already handled");

  if ((ev.event === "payment.captured" || ev.event === "order.paid") && orderId && pay?.id) {
    const r = await admin.rpc("svc_payment_success", { p_rzp_order: orderId, p_rzp_payment: pay.id, p_method: pay.method ?? null });
    if (r.error) return reply(500, "could not settle");
  } else if (ev.event === "payment.failed" && orderId) {
    await admin.rpc("svc_payment_failed", { p_rzp_order: orderId, p_reason: pay?.error_description ?? "Payment failed" });
  }
  return reply(200, "ok");
});
