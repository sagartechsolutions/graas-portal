// GRAAS portal server actions: member accounts, Razorpay orders and refunds, staff account tools.
// Runs inside Supabase with the service key. It never returns a secret and never logs a request body.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(SB_URL, SERVICE, noSession);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const out = (body: unknown) => new Response(JSON.stringify(body), { headers: { ...cors, "content-type": "application/json" } });
const fail = (error: string, extra: Record<string, unknown> = {}) => out({ ok: false, error, ...extra });
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha = async (s: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
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

async function rzp(g: any, method: string, path: string, body?: unknown) {
  try {
    const r = await fetch("https://api.razorpay.com/v1" + path, {
      method,
      headers: { authorization: "Basic " + btoa(`${g.key_id}:${g.key_secret}`), "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, j: j as any };
  } catch (_e) {
    return { ok: false, status: 0, j: {} as any };
  }
}
const rzpError = (r: { status: number; j: any }) => r.j?.error?.description ?? (r.status ? `Razorpay answered with error ${r.status}.` : "Razorpay could not be reached.");
const gateway = async () => ((await admin.rpc("svc_gateway")).data ?? {}) as any;
const ready = (g: any) => !!(g.enabled && g.key_id && g.key_secret);

/** Asks Razorpay what happened to an order and, if money was captured, activates the membership. Safe to repeat. */
async function settle(g: any, rzpOrderId: string) {
  const r = await rzp(g, "GET", `/orders/${rzpOrderId}/payments`);
  const items: any[] = r.j?.items ?? [];
  const p = items.find((x) => x.status === "captured") ?? items.find((x) => x.status === "authorized");
  if (!p) return false;
  if (p.status === "authorized") {
    const c = await rzp(g, "POST", `/payments/${p.id}/capture`, { amount: p.amount, currency: p.currency });
    if (!c.ok) return false;
  }
  const s = await admin.rpc("svc_payment_success", { p_rzp_order: rzpOrderId, p_rzp_payment: p.id, p_method: p.method ?? null });
  return !!s.data?.ok;
}

const STAFF_ROLES = ["super_admin", "membership_desk", "chapter_manager", "event_manager", "finance", "communications", "support", "regional_coordinator", "moderator"];
const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("Use POST.");
  let b: any;
  try {
    b = await req.json();
  } catch {
    return fail("Bad request.");
  }
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  let user: any = null;
  if (token.split(".").length === 3) user = (await admin.auth.getUser(token)).data?.user ?? null;
  const staff = user ? (await admin.from("staff_members").select("role,is_active").eq("user_id", user.id).maybeSingle()).data : null;
  const role: string | null = staff?.is_active ? staff.role : null;
  const is = (...roles: string[]) => role === "super_admin" || (role !== null && roles.includes(role));
  const asUser = () => createClient(SB_URL, req.headers.get("apikey") ?? ANON, { ...noSession, global: { headers: { Authorization: `Bearer ${token}` } } });
  const audit = (action: string, entity: string, entity_id: string, detail: Record<string, unknown> = {}) =>
    admin.from("audit_log").insert({ actor: user?.id ?? null, action, entity, entity_id, detail });

  switch (b?.action) {
    case "health":
      return out({ ok: true, service_key: SERVICE.length > 0 });

    case "signup": {
      if (b.website_hp) return fail("Could not create the account. Please try again.");
      const d = {
        plan_code: text(b.plan_code, 60),
        full_name: text(b.full_name, 80),
        email: text(b.email, 160).toLowerCase(),
        phone: String(b.phone ?? "").replace(/\D/g, "").slice(-10),
        dob: text(b.dob, 10),
        city: text(b.city, 80),
        state: text(b.state, 60),
        organisation: text(b.organisation, 120),
        designation: text(b.designation, 120),
        website: text(b.website, 160),
        ref: text(b.ref, 12),
        accept: b.accept === true,
      };
      const password = String(b.password ?? "");
      if (password.length < 8 || password.length > 72) return fail("Choose a password of at least 8 characters.", { field: "password" });
      const ipHash = await sha((req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() + "|graas");
      const chk = await admin.rpc("svc_signup_check", { p_data: d, p_ip_hash: ipHash });
      if (chk.error) return fail("Could not check the application. Please try again.");
      if (!chk.data?.ok) return out(chk.data);
      const made = await admin.auth.admin.createUser({
        email: d.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: d.full_name },
        app_metadata: { via: "member_signup" },
      });
      const id = made.data?.user?.id;
      if (made.error || !id) {
        const dup = /already|registered|exists/i.test(made.error?.message ?? "");
        return fail(dup ? "An account with this email already exists. Sign in instead." : "Could not create the account. Please try again.", { field: "email" });
      }
      // A website sign-up must never end up with staff rights.
      const leaked = (await admin.from("staff_members").select("user_id").eq("user_id", id).maybeSingle()).data;
      const done = leaked ? null : await admin.rpc("svc_signup", { p_user: id, p_data: d, p_ip_hash: ipHash });
      if (!done || done.error || !done.data?.ok) {
        await admin.auth.admin.deleteUser(id);
        return out(done?.data ?? { ok: false, error: "Could not save the application. Please try again." });
      }
      return out({ ok: true });
    }

    case "create_order": {
      if (!user) return fail("Please sign in again.");
      const g = await gateway();
      const o = await admin.rpc("svc_new_order", { p_user: user.id, p_coupon: b.coupon ? text(b.coupon, 20) : null, p_can_charge: ready(g) });
      if (o.error) return fail("Could not start the payment. Please try again.");
      if (!o.data?.ok || o.data.free) return out(o.data);
      const r = await rzp(g, "POST", "/orders", { amount: o.data.total_paise, currency: "INR", receipt: o.data.order_id, notes: { purpose: "GRAAS membership", plan: o.data.plan_name } });
      if (!r.ok || !r.j?.id) {
        await admin.rpc("svc_attach_rzp", { p_order: o.data.order_id, p_rzp_order: null, p_error: rzpError(r) });
        return fail("The payment could not be started. Please try again in a minute.");
      }
      await admin.rpc("svc_attach_rzp", { p_order: o.data.order_id, p_rzp_order: r.j.id });
      return out({ ok: true, key_id: g.key_id, rzp_order_id: r.j.id, amount: o.data.total_paise, description: o.data.plan_name, prefill: { name: o.data.name, email: o.data.email, contact: o.data.phone } });
    }

    case "verify_payment": {
      if (!user) return fail("Please sign in again.");
      const g = await gateway();
      const expected = await hmac(g.key_secret ?? "", `${b.rzp_order_id}|${b.rzp_payment_id}`);
      if (!g.key_secret || !same(expected, String(b.signature ?? ""))) return fail("The payment could not be confirmed here. If money was taken, it is matched automatically within a few minutes.");
      return (await settle(g, String(b.rzp_order_id))) ? out({ ok: true }) : fail("The payment is still being confirmed by the bank. Check again in a few minutes.");
    }

    case "recheck": {
      if (!user) return fail("Please sign in again.");
      const g = await gateway();
      const owned: string[] = (await admin.rpc("svc_order_lookup", { p_user: user.id, p_order: null })).data?.owned ?? [];
      let updated = 0;
      if (g.key_id && g.key_secret) for (const id of owned.slice(0, 5)) if (await settle(g, id)) updated++;
      return out({ ok: true, updated });
    }

    case "sync_order": {
      if (!is("finance", "membership_desk")) return fail("Your role cannot do this.");
      const g = await gateway();
      const o = (await admin.rpc("svc_order_lookup", { p_user: null, p_order: b.order_id })).data?.order;
      if (!o?.rzp_order_id) return fail("This order never reached Razorpay.");
      if (!g.key_id || !g.key_secret) return fail("Enter the Razorpay keys first.");
      return out({ ok: true, paid: await settle(g, o.rzp_order_id) });
    }

    case "gateway_test": {
      if (!is("finance")) return fail("Your role cannot do this.");
      const g = await gateway();
      if (!g.key_id || !g.key_secret) return fail("Save the Key ID and Key Secret first.");
      const r = await rzp(g, "GET", "/payments?count=1");
      return r.ok ? out({ ok: true, mode: g.mode }) : fail(r.status === 401 ? "Razorpay rejected these keys. Check that the Key ID and Key Secret are a matching pair." : rzpError(r));
    }

    case "refund": {
      if (!is("finance")) return fail("Your role cannot refund payments.");
      const u = asUser();
      let refundId: string | null = b.refund_id ?? null;
      if (!refundId) {
        const rq = await u.rpc("staff_request_refund", { p_order: b.order_id, p_amount_inr: Number(b.amount_inr), p_reason: text(b.reason, 300) });
        if (rq.error || !rq.data?.ok) return out(rq.data ?? { ok: false, error: "Could not record the refund." });
        refundId = rq.data.refund_id;
      }
      if (!(await u.rpc("staff_can_process_refund", { p_refund: refundId })).data) return out({ ok: true, waiting: true });
      const ctx = (await admin.rpc("svc_refund_context", { p_refund: refundId })).data;
      if (!ctx || ctx.status !== "requested") return fail("This refund is not waiting.");
      const g = await gateway();
      if (!g.key_id || !g.key_secret) return fail("Enter the Razorpay keys first.");
      const r = await rzp(g, "POST", `/payments/${ctx.rzp_payment_id}/refund`, { amount: ctx.amount_paise, notes: { reason: ctx.reason } });
      await admin.rpc("svc_refund_done", { p_refund: refundId, p_actor: user.id, p_rzp_refund: r.ok ? r.j.id : null, p_error: r.ok ? null : rzpError(r) });
      return r.ok ? out({ ok: true }) : fail("Razorpay did not accept the refund. " + rzpError(r));
    }

    case "set_password": {
      if (!is("membership_desk")) return fail("Your role cannot reset passwords.");
      const pw = String(b.password ?? "");
      if (pw.length < 8 || pw.length > 72) return fail("The temporary password needs at least 8 characters.");
      const target = String(b.user_id ?? "");
      const tStaff = (await admin.from("staff_members").select("user_id").eq("user_id", target).maybeSingle()).data;
      if (tStaff && role !== "super_admin") return fail("Only a super admin can reset a staff password.");
      const r = await admin.auth.admin.updateUserById(target, { password: pw });
      if (r.error) return fail("Could not reset the password.");
      await audit("password_reset", "profiles", target);
      return out({ ok: true });
    }

    case "staff_create": {
      if (role !== "super_admin") return fail("Only a super admin can add staff.");
      const email = text(b.email, 160).toLowerCase();
      const pw = String(b.password ?? "");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return fail("Enter a valid email address.");
      if (!STAFF_ROLES.includes(b.role)) return fail("Choose a role.");
      if (pw.length < 8 || pw.length > 72) return fail("The first password needs at least 8 characters.");
      const made = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true, user_metadata: { full_name: text(b.full_name, 80) }, app_metadata: { via: "staff_create" } });
      const id = made.data?.user?.id;
      if (made.error || !id) return fail(/already|registered|exists/i.test(made.error?.message ?? "") ? "An account with this email already exists. For safety, staff accounts are always created new." : "Could not create the staff account.");
      const ins = await admin.from("staff_members").upsert({ user_id: id, role: b.role, is_active: true, created_by: user.id });
      if (ins.error) {
        await admin.auth.admin.deleteUser(id);
        return fail("Could not save the staff role.");
      }
      await audit("staff_created", "staff_members", id, { email, role: b.role });
      return out({ ok: true });
    }

    case "delete_member": {
      if (role !== "super_admin") return fail("Only a super admin can delete an account.");
      const target = String(b.user_id ?? "");
      if (target === user.id) return fail("You cannot delete your own account.");
      if ((await admin.from("staff_members").select("user_id").eq("user_id", target).maybeSingle()).data) return fail("Remove the staff role first.");
      const p = (await admin.from("profiles").select("email,full_name").eq("id", target).maybeSingle()).data;
      const r = await admin.auth.admin.deleteUser(target);
      if (r.error) return fail("Could not delete the account.");
      await audit("account_deleted", "profiles", target, { email: p?.email ?? null, name: p?.full_name ?? null });
      return out({ ok: true });
    }

    default:
      return fail("Unknown action.");
  }
});
