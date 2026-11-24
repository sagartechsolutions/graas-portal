// GRAAS portal server actions: member accounts, verification codes, Razorpay orders and refunds, staff tools.
// Runs inside Supabase with the service key. It never returns a secret and never logs a request body.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  deliver,
  emailReady,
  graph,
  graphError,
  loadMessaging,
  metaTemplate,
  nowIST,
  waReady,
  waTemplateReady,
  type Messaging,
  type Sent,
} from "../_shared/messaging.ts";
import { firstPassword, loginVars, provisionRows, sendLogin } from "../_shared/provision.ts";

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
const rzpError = (r: { status: number; j: any }) => {
  const e = r.j?.error;
  if (!e) return r.status ? `Razorpay answered with error ${r.status}.` : "Razorpay could not be reached.";
  const extra = [e.reason && e.reason !== "NA" ? e.reason : null, e.field ? `field ${e.field}` : null, e.step && e.step !== "NA" ? `step ${e.step}` : null].filter(Boolean).join(", ");
  return `${e.description ?? "Razorpay refused the request."}${extra ? ` (${extra})` : ""}`;
};
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

const firstName = (n: unknown) => String(n ?? "").trim().split(/\s+/)[0] || "there";
const normEmail = (v: unknown) => String(v ?? "").trim().toLowerCase().slice(0, 160);
const isEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v);
const mobile = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(-10);
const isMobile = (v: string) => /^[6-9][0-9]{9}$/.test(v);
const maskEmail = (e: string) => e.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + "*".repeat(Math.min(Math.max(b.length, 2), 6)) + c);
const maskPhone = (p: string) => "+91 ***** " + p.slice(-5);
const profileOf = async (id: string) => (await admin.from("profiles").select("*").eq("id", id).maybeSingle()).data as any;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Creates a six-digit code, sends it, and logs the message with the code hidden. */
async function sendCode(
  m: Messaging,
  o: { purpose: string; channel: "email" | "whatsapp"; target: string; user: string | null; ip: string; event: string; name: string },
): Promise<{ ok: boolean; error?: string; minutes?: number; wait?: number }> {
  const c = await admin.rpc("svc_issue_code", { p_purpose: o.purpose, p_channel: o.channel, p_target: o.target, p_user: o.user, p_ip_hash: o.ip });
  if (c.error) return { ok: false, error: "Could not create a code. Please try again." };
  if (!c.data?.ok) return c.data;
  const code = String(c.data.code);
  const vars = { name: o.name, code, minutes: String(c.data.minutes) };
  const r: Sent = await deliver(m, o.event, o.channel, o.target, vars);
  await admin.rpc("svc_log_message", {
    p_user: o.user,
    p_event: o.event,
    p_channel: o.channel,
    p_to: o.target,
    p_vars: { ...vars, code: "******" },
    p_ok: r.ok,
    p_provider_id: r.id ?? null,
    p_error: r.ok ? null : r.error ?? null,
    p_subject: r.subject ? r.subject.split(code).join("******") : null,
    p_actor: null,
  });
  if (!r.ok) {
    return {
      ok: false,
      error: o.channel === "email" ? "We could not send the email just now. Please try again in a minute." : "We could not send the WhatsApp message just now. Please try again in a minute.",
    };
  }
  return { ok: true, minutes: c.data.minutes };
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
  const ipHash = () => sha((req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() + "|graas");

  switch (b?.action) {
    case "chapter_signup": {
      // A faculty member or teacher who wants to start a chapter. No membership is needed to lead one.
      if (b.website_hp) return fail("Could not create the account. Please try again.");
      const d = {
        full_name: text(b.full_name, 80),
        email: text(b.email, 160).toLowerCase(),
        phone: mobile(b.phone),
        designation: text(b.designation, 120),
        organisation: text(b.organisation, 120),
        city: text(b.city, 80),
        accept: b.accept === true,
      };
      const password = String(b.password ?? "");
      if (password.length < 8 || password.length > 72) return fail("Choose a password of at least 8 characters.", { field: "password" });
      const ip = await ipHash();
      const chk = await admin.rpc("svc_head_check", { p_data: d, p_ip_hash: ip });
      if (chk.error) return fail("Could not check the details. Please try again.");
      if (!chk.data?.ok) return out(chk.data);
      const made = await admin.auth.admin.createUser({
        email: d.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: d.full_name },
        app_metadata: { via: "chapter_head" },
      });
      const id = made.data?.user?.id;
      if (made.error || !id) {
        const dup = /already|registered|exists/i.test(made.error?.message ?? "");
        return fail(dup ? "An account with this email already exists. Sign in, then open the chapter page." : "Could not create the account. Please try again.", { field: "email" });
      }
      const leaked = (await admin.from("staff_members").select("user_id").eq("user_id", id).maybeSingle()).data;
      const done = leaked ? null : await admin.rpc("svc_head_signup", { p_user: id, p_data: d, p_ip_hash: ip });
      if (!done || done.error || !done.data?.ok) {
        await admin.auth.admin.deleteUser(id);
        return fail("Could not create the account. Please try again.");
      }
      const m = await loadMessaging(admin);
      if (!emailReady(m)) return out({ ok: true, verify: null });
      const sent = await sendCode(m, { purpose: "verify_email", channel: "email", target: d.email, user: id, ip, event: "code_verify_email", name: firstName(d.full_name) });
      return out({ ok: true, verify: "email", sent: sent.ok, sent_to: d.email, minutes: sent.minutes ?? 10 });
    }

    case "chapter_provision": {
      // Sets up logins for students who are ready, straight after an approval or payment, instead of waiting for the timer.
      if (!user) return fail("Please sign in again.");
      const chapter = String(b.chapter_id ?? "");
      const c = (await admin.from("chapters").select("id,head_user").eq("id", chapter).maybeSingle()).data;
      if (!c) return fail("Chapter not found.");
      if (c.head_user !== user.id && !is("chapter_manager", "membership_desk")) return fail("Only the chapter coordinator or GRAAS staff can do this.");
      const logins = await provisionRows(admin, await loadMessaging(admin), { chapter: c.id, deadline: Date.now() + 25_000 });
      const left = (await admin.from("chapter_members").select("id", { count: "exact", head: true }).eq("chapter_id", c.id).in("status", ["ready", "provisioning"])).count ?? 0;
      return out({ ok: true, ...logins, left });
    }

    case "chapter_resend": {
      // A new first password for a student who has not signed in yet (lost email, typo in the inbox, and so on).
      if (!user) return fail("Please sign in again.");
      const info = (await admin.rpc("svc_roster_resend_info", { p_row: String(b.row_id ?? ""), p_actor: user.id })).data;
      if (!info?.ok) return out(info ?? { ok: false, error: "Could not find this student." });
      const m = await loadMessaging(admin);
      if (!emailReady(m)) return fail("Email sending is switched off in Admin, so the login cannot be sent.");
      const password = firstPassword();
      const u = await admin.auth.admin.updateUserById(info.user_id, { password });
      if (u.error) return fail("Could not reset the first password. Please try again.");
      const vars = loginVars({ full_name: info.full_name, email: info.email, member_no: info.member_no, plan: info.plan, chapter: info.chapter, pay: info.pay, amount: info.amount }, password);
      const sent = await sendLogin(admin, m, info.user_id, info.email, vars);
      await admin.rpc("svc_roster_sent", { p_row: String(b.row_id), p_ok: sent.ok, p_error: sent.ok ? null : sent.error ?? "Not sent." });
      await audit("chapter_login_resent", "chapter_members", String(b.row_id), { sent: sent.ok });
      return sent.ok ? out({ ok: true, sent_to: maskEmail(info.email) }) : fail(sent.error ?? "The email could not be sent. Try again in a few minutes.");
    }

    case "first_password": {
      // The student replaces the first password from their chapter login email, and accepts the rules.
      if (!user) return fail("Please sign in again.");
      const p = await profileOf(user.id);
      if (!p?.must_change_password) return fail("Your password is already set. Use Change password in your profile.");
      const pw = String(b.password ?? "");
      if (pw.length < 8 || pw.length > 72) return fail("Choose a password of at least 8 characters.", { field: "password" });
      if (b.accept !== true) return fail("Please accept the membership rules and policies to continue.", { field: "accept" });
      const u = await admin.auth.admin.updateUserById(user.id, { password: pw });
      if (u.error) return fail(/weak|short|pwned|leak/i.test(u.error.message ?? "") ? "Choose a stronger password." : "Could not save the password. Please try again.", { field: "password" });
      await admin.rpc("svc_first_password_done", { p_user: user.id });
      await audit("first_password_set", "profiles", user.id);
      return out({ ok: true });
    }

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
        gender: text(b.gender, 40),
        course: text(b.course, 80),
        course_other: text(b.course_other, 80),
        branch: text(b.branch, 80),
        branch_other: text(b.branch_other, 80),
        study_year: text(b.study_year, 40),
        guardian_name: text(b.guardian_name, 80),
        guardian_phone: String(b.guardian_phone ?? "").replace(/\D/g, "").slice(-10),
        guardian_agree: b.guardian_agree === true,
        accept: b.accept === true,
      };
      const password = String(b.password ?? "");
      if (password.length < 8 || password.length > 72) return fail("Choose a password of at least 8 characters.", { field: "password" });
      const ip = await ipHash();
      const chk = await admin.rpc("svc_signup_check", { p_data: d, p_ip_hash: ip });
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
      const done = leaked ? null : await admin.rpc("svc_signup", { p_user: id, p_data: d, p_ip_hash: ip });
      if (!done || done.error || !done.data?.ok) {
        await admin.auth.admin.deleteUser(id);
        return out(done?.data ?? { ok: false, error: "Could not save the application. Please try again." });
      }
      // Email confirmation: the code goes out now, and the member types it on the next screen.
      const m = await loadMessaging(admin);
      if (!emailReady(m)) return out({ ok: true, verify: null });
      const sent = await sendCode(m, { purpose: "verify_email", channel: "email", target: d.email, user: id, ip, event: "code_verify_email", name: firstName(d.full_name) });
      return out({ ok: true, verify: "email", sent: sent.ok, sent_to: d.email, minutes: sent.minutes ?? 10 });
    }

    case "create_order": {
      if (!user) return fail("Please sign in again.");
      {
        const m = await loadMessaging(admin);
        const p = await profileOf(user.id);
        if (emailReady(m) && (m.verify?.email_required ?? true) && !p?.email_verified_at) {
          return fail("Confirm your email before paying. Use the code we sent you, or ask for a new one at the top of this page.", { need: "email" });
        }
        if (waTemplateReady(m, "code_verify_phone") && m.verify?.phone_required && !p?.phone_verified_at) {
          return fail("Confirm your WhatsApp number before paying. You can do it at the top of this page.", { need: "phone" });
        }
      }
      const g = await gateway();
      let o: any;
      if (b.purpose === "change") {
        // Fee difference for a membership type change that staff have approved.
        o = await admin.rpc("svc_new_change_order", { p_user: user.id, p_can_charge: ready(g) });
      } else if (b.purpose === "chapter") {
        // A chapter coordinator paying in one go for students beyond the free seats.
        const ids = Array.isArray(b.ids) ? b.ids.map(String).filter((x: string) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 500) : [];
        o = await admin.rpc("svc_new_chapter_order", { p_user: user.id, p_ids: ids, p_can_charge: ready(g) });
      } else {
        const years = Number(b.years ?? 1);
        if (!Number.isInteger(years) || years < 1 || years > 10) return fail("Choose a membership length.");
        o = await admin.rpc("svc_new_order", { p_user: user.id, p_coupon: b.coupon ? text(b.coupon, 20) : null, p_can_charge: ready(g), p_years: years });
      }
      if (o.error) return fail("Could not start the payment. Please try again.");
      if (!o.data?.ok || o.data.free) return out(o.data);
      const r = await rzp(g, "POST", "/orders", {
        amount: o.data.total_paise,
        currency: "INR",
        receipt: o.data.order_id,
        notes: { purpose: o.data.chapter_id ? "GRAAS chapter seats" : "GRAAS membership", plan: o.data.plan_name },
      });
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
      if (!(await settle(g, String(b.rzp_order_id)))) return fail("The payment is still being confirmed by the bank. Check again in a few minutes.");
      const paid = (await admin.from("orders").select("chapter_id").eq("rzp_order_id", String(b.rzp_order_id)).maybeSingle()).data;
      if (paid?.chapter_id) {
        const logins = await provisionRows(admin, await loadMessaging(admin), { chapter: paid.chapter_id, deadline: Date.now() + 20_000 });
        return out({ ok: true, logins });
      }
      return out({ ok: true });
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
      const r = await rzp(g, "POST", `/payments/${ctx.rzp_payment_id}/refund`, { amount: Number(ctx.amount_paise), speed: "normal", notes: { reason: String(ctx.reason ?? "").slice(0, 250) } });
      await admin.rpc("svc_refund_done", { p_refund: refundId, p_actor: user.id, p_rzp_refund: r.ok ? r.j.id : null, p_error: r.ok ? null : rzpError(r) });
      if (!r.ok) await audit("refund_failed", "refunds", String(refundId), { status: r.status, error: r.j?.error ?? null, mode: g.mode });
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
      await admin.rpc("svc_enqueue", { p_user: target, p_event: "password_changed", p_vars: { when: nowIST() }, p_dedupe: null });
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
      await admin.rpc("svc_mark_verified", { p_user: id, p_kind: "email" });
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

    case "send_code": {
      const purpose = String(b.purpose ?? "");
      const m = await loadMessaging(admin);
      const ip = await ipHash();

      if (purpose === "verify_email") {
        if (!user) return fail("Please sign in again.");
        const p = await profileOf(user.id);
        if (p?.email_verified_at) return out({ ok: true, already: true });
        if (!emailReady(m)) return fail("Email confirmation is not switched on yet.");
        const r = await sendCode(m, { purpose, channel: "email", target: normEmail(p.email), user: user.id, ip, event: "code_verify_email", name: firstName(p.full_name) });
        return out({ ...r, sent_to: p.email });
      }

      if (purpose === "verify_phone") {
        if (!user) return fail("Please sign in again.");
        const p = await profileOf(user.id);
        if (!p?.phone) return fail("Add your mobile number in Profile first.");
        if (p.phone_verified_at) return out({ ok: true, already: true });
        if (!waTemplateReady(m, "code_verify_phone")) return fail("WhatsApp confirmation is not switched on yet.");
        const r = await sendCode(m, { purpose, channel: "whatsapp", target: "91" + p.phone, user: user.id, ip, event: "code_verify_phone", name: firstName(p.full_name) });
        return out({ ...r, sent_to: maskPhone(p.phone) });
      }

      if (purpose === "change_email") {
        if (!user) return fail("Please sign in again.");
        const p = await profileOf(user.id);
        const email = normEmail(b.email);
        if (!isEmail(email)) return fail("Enter a valid email address.", { field: "email" });
        if (email === normEmail(p?.email)) return fail("This is already your email.", { field: "email" });
        if (!emailReady(m)) return fail("Email changes need email sending, which is not switched on yet. Write to us from Help instead.");
        if ((await admin.rpc("svc_email_taken", { p_email: email, p_user: user.id })).data) return fail("Another GRAAS account already uses this email.", { field: "email" });
        const r = await sendCode(m, { purpose, channel: "email", target: email, user: user.id, ip, event: "code_change_email", name: firstName(p?.full_name) });
        return out({ ...r, sent_to: email });
      }

      if (purpose === "reset_password") {
        const email = b.email ? normEmail(b.email) : "";
        const phone = !email && b.phone ? mobile(b.phone) : "";
        if (email && !isEmail(email)) return fail("Enter a valid email address.", { field: "email" });
        if (!email && !isMobile(phone)) return fail("Enter your email address or your 10-digit mobile number.", { field: "email" });
        if (email && !emailReady(m)) return fail("Password reset by email is not available yet. Write to connect@graas.org.in and we will help.");
        if (phone && !waTemplateReady(m, "code_reset_password")) return fail("Codes on WhatsApp are not available yet. Use your email address instead.");
        const shown = email ? maskEmail(email) : maskPhone(phone);
        const acc = (await admin.rpc("svc_find_account", { p_email: email || null, p_phone: phone || null })).data;
        if (!acc?.user_id) {
          // Same answer whether or not an account exists, so nobody can test which emails are registered.
          await pause(600 + Math.floor(Math.random() * 500));
          return out({ ok: true, sent_to: shown, channel: email ? "email" : "whatsapp", minutes: 10 });
        }
        const p = await profileOf(acc.user_id);
        const r = await sendCode(m, {
          purpose,
          channel: email ? "email" : "whatsapp",
          target: email || "91" + phone,
          user: acc.user_id,
          ip,
          event: "code_reset_password",
          name: firstName(p?.full_name),
        });
        return out({ ...r, sent_to: shown, channel: email ? "email" : "whatsapp" });
      }
      return fail("Unknown request.");
    }

    case "verify_code": {
      const purpose = String(b.purpose ?? "");
      const code = String(b.code ?? "").replace(/\D/g, "").slice(0, 6);
      if (code.length !== 6) return fail("Enter the 6-digit code.", { field: "code" });
      if (!user) return fail("Please sign in again.");
      const p = await profileOf(user.id);

      if (purpose === "verify_email" || purpose === "verify_phone") {
        const target = purpose === "verify_email" ? normEmail(p?.email) : "91" + (p?.phone ?? "");
        const c = await admin.rpc("svc_check_code", { p_purpose: purpose, p_target: target, p_code: code });
        if (c.error || !c.data?.ok) return out(c.data ?? { ok: false, error: "Could not check the code. Please try again." });
        const v = await admin.rpc("svc_mark_verified", { p_user: user.id, p_kind: purpose === "verify_email" ? "email" : "phone" });
        return out(v.data ?? { ok: false, error: "Could not save. Please try again." });
      }

      if (purpose === "change_email") {
        const email = normEmail(b.email);
        if (!isEmail(email)) return fail("Enter a valid email address.", { field: "email" });
        const c = await admin.rpc("svc_check_code", { p_purpose: purpose, p_target: email, p_code: code });
        if (c.error || !c.data?.ok) return out(c.data ?? { ok: false, error: "Could not check the code. Please try again." });
        if (c.data.user_id !== user.id) return fail("This code was not sent for your account.");
        if ((await admin.rpc("svc_email_taken", { p_email: email, p_user: user.id })).data) return fail("Another GRAAS account already uses this email.");
        const old = normEmail(p?.email);
        const u = await admin.auth.admin.updateUserById(user.id, { email, email_confirm: true });
        if (u.error) return fail("Could not change the email. Please try again.");
        await admin.rpc("svc_set_email", { p_user: user.id, p_email: email });
        await audit("email_changed", "profiles", user.id, { from: old, to: email });
        if (old) {
          const m = await loadMessaging(admin);
          const vars = { name: firstName(p?.full_name), new_email: email, when: nowIST() };
          const r = await deliver(m, "email_changed", "email", old, vars);
          await admin.rpc("svc_log_message", { p_user: user.id, p_event: "email_changed", p_channel: "email", p_to: old, p_vars: vars, p_ok: r.ok, p_provider_id: r.id ?? null, p_error: r.ok ? null : r.error ?? null, p_subject: r.subject ?? null, p_actor: user.id });
        }
        return out({ ok: true, email });
      }
      return fail("Unknown request.");
    }

    case "reset_password": {
      const email = b.email ? normEmail(b.email) : "";
      const phone = !email && b.phone ? mobile(b.phone) : "";
      const code = String(b.code ?? "").replace(/\D/g, "").slice(0, 6);
      const pw = String(b.password ?? "");
      if (code.length !== 6) return fail("Enter the 6-digit code.", { field: "code" });
      if (pw.length < 8 || pw.length > 72) return fail("Choose a password of at least 8 characters.", { field: "password" });
      if (!email && !isMobile(phone)) return fail("Start again and enter your email or mobile number.");
      const acc = (await admin.rpc("svc_find_account", { p_email: email || null, p_phone: phone || null })).data;
      if (!acc?.user_id) {
        await pause(400);
        return fail("That code is not right. Check it and try again.", { field: "code" });
      }
      const c = await admin.rpc("svc_check_code", { p_purpose: "reset_password", p_target: email || "91" + phone, p_code: code });
      if (c.error || !c.data?.ok) return out({ ...(c.data ?? { ok: false, error: "Could not check the code. Please try again." }), field: "code" });
      if (c.data.user_id !== acc.user_id) return fail("That code is not right. Check it and try again.", { field: "code" });
      const u = await admin.auth.admin.updateUserById(acc.user_id, { password: pw });
      if (u.error) return fail("Could not change the password. Please try again.");
      if (email) await admin.rpc("svc_mark_verified", { p_user: acc.user_id, p_kind: "email" });
      await admin.rpc("svc_enqueue", { p_user: acc.user_id, p_event: "password_changed", p_vars: { when: nowIST() }, p_dedupe: null });
      await admin.from("audit_log").insert({ actor: acc.user_id, action: "password_reset_by_code", entity: "profiles", entity_id: acc.user_id, detail: { via: email ? "email" : "whatsapp" } });
      return out({ ok: true, email: acc.email });
    }

    case "change_password": {
      if (!user?.email) return fail("Please sign in again.");
      const current = String(b.current ?? "");
      const pw = String(b.password ?? "");
      if (pw.length < 8 || pw.length > 72) return fail("Choose a new password of at least 8 characters.", { field: "password" });
      if (pw === current) return fail("The new password must be different from the current one.", { field: "password" });
      const check = createClient(SB_URL, ANON, noSession);
      const s = await check.auth.signInWithPassword({ email: user.email, password: current });
      if (s.error || !s.data?.session) return fail("Your current password is not right.", { field: "current" });
      await check.auth.signOut();
      const u = await admin.auth.admin.updateUserById(user.id, { password: pw });
      if (u.error) return fail("Could not change the password. Please try again.");
      await admin.rpc("svc_enqueue", { p_user: user.id, p_event: "password_changed", p_vars: { when: nowIST() }, p_dedupe: null });
      await audit("password_changed", "profiles", user.id);
      return out({ ok: true });
    }

    case "pin_code": {
      if (!role || !user?.email) return fail("Only GRAAS staff can do this.");
      const m = await loadMessaging(admin);
      if (!emailReady(m)) return fail("Email sending must be on to set a PIN. Switch it on under Messages first.");
      const p = await profileOf(user.id);
      const r = await sendCode(m, { purpose: "staff_pin", channel: "email", target: normEmail(user.email), user: user.id, ip: await ipHash(), event: "code_staff_pin", name: firstName(p?.full_name) });
      return out({ ...r, sent_to: maskEmail(normEmail(user.email)) });
    }

    case "set_pin": {
      if (!role || !user?.email) return fail("Only GRAAS staff can do this.");
      const pin = String(b.pin ?? "");
      const code = String(b.code ?? "").replace(/\D/g, "").slice(0, 6);
      if (!/^[0-9]{6}$/.test(pin)) return fail("The PIN must be exactly 6 digits.", { field: "pin" });
      if (/^(\d)\1{5}$/.test(pin) || "01234567890".includes(pin) || "09876543210".includes(pin) || ["121212", "112233", "123123", "123321", "111222", "101010"].includes(pin)) {
        return fail("Choose a PIN that is harder to guess: not all the same digit and not in order like 123456.", { field: "pin" });
      }
      if (code.length !== 6) return fail("Enter the 6-digit code from the email.", { field: "code" });
      const check = createClient(SB_URL, ANON, noSession);
      const s = await check.auth.signInWithPassword({ email: user.email, password: String(b.password ?? "") });
      if (s.error || !s.data?.session) return fail("Your account password is not right.", { field: "password" });
      await check.auth.signOut();
      const c = await admin.rpc("svc_check_code", { p_purpose: "staff_pin", p_target: normEmail(user.email), p_code: code });
      if (c.error || !c.data?.ok) return out({ ...(c.data ?? { ok: false, error: "Could not check the code. Please try again." }), field: "code" });
      const r = await admin.rpc("svc_set_pin", { p_user: user.id, p_pin: pin });
      if (r.error || !r.data?.ok) return out(r.data ?? { ok: false, error: "Could not save the PIN. Please try again." });
      await audit("security_pin_set", "staff_members", user.id);
      const m = await loadMessaging(admin);
      const p = await profileOf(user.id);
      const vars = { name: firstName(p?.full_name), when: nowIST() };
      const sent = await deliver(m, "security_pin_changed", "email", normEmail(user.email), vars);
      await admin.rpc("svc_log_message", { p_user: user.id, p_event: "security_pin_changed", p_channel: "email", p_to: normEmail(user.email), p_vars: vars, p_ok: sent.ok, p_provider_id: sent.id ?? null, p_error: sent.ok ? null : sent.error ?? null, p_subject: sent.subject ?? null, p_actor: user.id });
      return out({ ok: true });
    }

    case "msg_test": {
      if (!is("communications")) return fail("Your role cannot send tests.");
      const m0 = await loadMessaging(admin);
      const channel = b.channel === "whatsapp" ? "whatsapp" : "email";
      let r: Sent;
      let to: string;
      if (channel === "email") {
        to = normEmail(b.to);
        if (!isEmail(to)) return fail("Enter the email address to send the test to.");
        if (!m0.brevo_key) return fail("Save the Brevo API key first.");
        // A test works before email is switched on, so the settings can be checked first.
        const m = { ...m0, email: { ...m0.email, enabled: true } };
        r = await deliver(m, "test", "email", to, { name: "there" });
      } else {
        const ph = mobile(b.to);
        if (!isMobile(ph)) return fail("Enter the 10-digit mobile number to send the test to.");
        to = "91" + ph;
        if (!m0.wa_token || !m0.whatsapp?.phone_number_id) return fail("Save the Phone number ID and access token first.");
        // hello_world is the sample template Meta places in every WhatsApp Business account.
        const g = await graph(m0, "POST", `${m0.whatsapp.phone_number_id}/messages`, {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: { name: "hello_world", language: { code: "en_US" } },
        });
        r = g.ok ? { ok: true, id: g.j?.messages?.[0]?.id ?? null, subject: "hello_world" } : { ok: false, error: graphError(g) };
      }
      await admin.rpc("svc_log_message", { p_user: null, p_event: "test", p_channel: channel, p_to: to, p_vars: {}, p_ok: r.ok, p_provider_id: r.id ?? null, p_error: r.ok ? null : r.error ?? null, p_subject: r.subject ?? null, p_actor: user.id });
      return r.ok ? out({ ok: true }) : fail(r.error ?? "Not sent.");
    }

    case "wa_sync": {
      if (role !== "super_admin") return fail("Only a super admin can do this.");
      const m = await loadMessaging(admin);
      const waba = m.whatsapp?.waba_id;
      if (!m.wa_token || !waba) return fail("Save the WhatsApp Business Account ID and the access token first.");
      const list = await graph(m, "GET", `${waba}/message_templates?fields=name,status,category,language,rejected_reason&limit=250`);
      if (!list.ok) return fail(graphError(list));
      const have = new Map<string, any>();
      for (const t of list.j?.data ?? []) have.set(`${t.name}|${t.language}`, t);
      const rows = (m.templates ?? []).filter((t) => t.channel === "whatsapp" && t.wa_name);
      const created: string[] = [];
      const errors: string[] = [];
      if (b.create) {
        const seen = new Set<string>();
        for (const t of rows) {
          const key = `${t.wa_name}|${t.wa_lang || "en"}`;
          if (have.has(key) || seen.has(key)) continue;
          seen.add(key);
          if (!t.enabled && t.wa_category === "MARKETING") continue;
          const r = await graph(m, "POST", `${waba}/message_templates`, metaTemplate(t));
          if (r.ok) {
            created.push(t.wa_name!);
            have.set(key, { name: t.wa_name, status: r.j?.status ?? "PENDING", category: r.j?.category ?? t.wa_category });
          } else errors.push(`${t.wa_name}: ${graphError(r)}`);
        }
      }
      for (const t of rows) {
        const st = have.get(`${t.wa_name}|${t.wa_lang || "en"}`)?.status ?? null;
        if (st !== t.wa_status) await admin.from("message_templates").update({ wa_status: st }).eq("event", t.event).eq("channel", "whatsapp");
      }
      let phone: any = null;
      if (m.whatsapp?.phone_number_id) {
        const ph = await graph(m, "GET", `${m.whatsapp.phone_number_id}?fields=display_phone_number,verified_name,name_status,quality_rating,code_verification_status,messaging_limit_tier`);
        phone = ph.ok ? ph.j : { error: graphError(ph) };
      }
      const statuses = [...new Map(rows.map((t) => [t.wa_name, have.get(`${t.wa_name}|${t.wa_lang || "en"}`)])).entries()].map(([name, t]) => ({
        name,
        status: t?.status ?? "NOT_SUBMITTED",
        category: t?.category ?? null,
        reason: t?.rejected_reason && t.rejected_reason !== "NONE" ? t.rejected_reason : null,
      }));
      return out({ ok: true, created, errors, statuses, phone, wa_ready: waReady(m) });
    }

    default:
      return fail("Unknown action.");
  }
});
