// Sends queued GRAAS messages. Called by the database (pg_net) right after messages are queued, and by pg_cron
// every two minutes. Only a caller holding the notify key can start it; it takes no input.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { deliver, loadMessaging } from "../_shared/messaging.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function same(a: string, b: string) {
  if (!a || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false }, 405);
  const m = await loadMessaging(admin);
  if (!same(m.notify_key ?? "", req.headers.get("x-notify-key") ?? "")) return json({ ok: false }, 401);

  const started = Date.now();
  let sent = 0;
  let failed = 0;
  while (Date.now() - started < 45_000) {
    const batch: any[] = (await admin.rpc("svc_claim_messages", { p_limit: 25 })).data ?? [];
    if (!batch.length) break;
    for (const msg of batch) {
      const r = await deliver(m, msg.event, msg.channel, msg.to_addr, msg.vars ?? {});
      await admin.rpc("svc_message_done", {
        p_id: msg.id,
        p_ok: r.ok,
        p_provider_id: r.id ?? null,
        p_error: r.ok ? null : r.error ?? "Not sent.",
        p_subject: r.subject ?? null,
        p_retry: !!r.retry,
      });
      if (r.ok) sent++;
      else failed++;
    }
  }
  return json({ ok: true, sent, failed });
});
