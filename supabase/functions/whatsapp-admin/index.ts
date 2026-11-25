// GRAAS WhatsApp admin: Meta set-up checks, template submission, number registration, business profile and inbox replies.
// Signed-in staff only; each action checks the role. It never returns the access token or the app secret.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { graph, graphError, loadMessaging, metaTemplate, waReady } from "../_shared/messaging.ts";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(SB_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

// Only the GRAAS website may call this from a browser.
const cors = {
  "Access-Control-Allow-Origin": "https://graas.org.in",
  Vary: "Origin",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const out = (body: unknown) => new Response(JSON.stringify(body), { headers: { ...cors, "content-type": "application/json" } });
const fail = (error: string, extra: Record<string, unknown> = {}) => out({ ok: false, error, ...extra });
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
  const user = token.split(".").length === 3 ? (await admin.auth.getUser(token)).data?.user ?? null : null;
  if (!user) return fail("Please sign in again.");
  const staff = (await admin.from("staff_members").select("role,is_active").eq("user_id", user.id).maybeSingle()).data;
  const role: string | null = staff?.is_active ? staff.role : null;
  if (!role) return fail("Only GRAAS staff can do this.");
  const is = (...roles: string[]) => role === "super_admin" || roles.includes(role);
  const audit = (action: string, entity: string, entity_id: string, detail: Record<string, unknown> = {}) =>
    admin.from("audit_log").insert({ actor: user.id, action, entity, entity_id, detail });

  switch (b?.action) {
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
        const pid = m.whatsapp.phone_number_id;
        const ph = await graph(m, "GET", `${pid}?fields=display_phone_number,verified_name,name_status,quality_rating,code_verification_status,platform_type`);
        phone = ph.ok ? ph.j : { error: graphError(ph) };
        if (ph.ok) {
          // Meta moved the daily limit to the business portfolio (October 2025); older field names are not asked for.
          const lim = await graph(m, "GET", `${pid}?fields=whatsapp_business_manager_messaging_limit`);
          if (lim.ok) phone.limit = lim.j?.whatsapp_business_manager_messaging_limit ?? null;
          phone.registered = ph.j?.platform_type === "CLOUD_API";
        }
      }
      // Meta only sends delivery reports and replies to an app that is linked to the WhatsApp account. Linking twice is harmless.
      const sub = await graph(m, "POST", `${waba}/subscribed_apps`);
      const statuses = [...new Map(rows.map((t) => [t.wa_name, have.get(`${t.wa_name}|${t.wa_lang || "en"}`)])).entries()].map(([name, t]) => ({
        name,
        status: t?.status ?? "NOT_SUBMITTED",
        category: t?.category ?? null,
        reason: t?.rejected_reason && t.rejected_reason !== "NONE" ? t.rejected_reason : null,
      }));
      return out({ ok: true, created, errors, statuses, phone, wa_ready: waReady(m), linked: sub.ok, link_error: sub.ok ? null : graphError(sub) });
    }

    case "wa_register": {
      // Meta needs the number registered for Cloud API by an API call; WhatsApp Manager cannot do it.
      // The 6-digit two-step PIN goes straight to Meta: it is never stored or logged.
      if (role !== "super_admin") return fail("Only a super admin can do this.");
      const m = await loadMessaging(admin);
      const pid = m.whatsapp?.phone_number_id;
      if (!m.wa_token || !pid) return fail("Save the Phone number ID and the access token first.");
      const pin = String(b.pin ?? "");
      if (!/^[0-9]{6}$/.test(pin)) return fail("The two-step PIN is exactly 6 digits.", { field: "wa_pin" });
      const r = await graph(m, "POST", `${pid}/register`, { messaging_product: "whatsapp", pin });
      await audit(r.ok ? "whatsapp_registered" : "whatsapp_register_failed", "whatsapp", String(pid), r.ok ? {} : { error: graphError(r) });
      if (!r.ok) return fail(graphError(r));
      if (m.whatsapp?.waba_id) await graph(m, "POST", `${m.whatsapp.waba_id}/subscribed_apps`);
      return out({ ok: true });
    }

    case "wa_profile": {
      // The business profile people see when they tap GRAAS in WhatsApp: about line, description, email and website.
      if (!is("communications")) return fail("Your role cannot do this.");
      const m = await loadMessaging(admin);
      const pid = m.whatsapp?.phone_number_id;
      if (!m.wa_token || !pid) return fail("Save the Phone number ID and the access token first.");
      const org = ((await admin.from("site_settings").select("value").eq("key", "org").maybeSingle()).data?.value ?? {}) as any;
      const profile: Record<string, unknown> = {
        messaging_product: "whatsapp",
        about: text(b.about ?? "Global Robotics And Automation Society. graas.org.in", 139),
        description: text(
          b.description ??
            "GRAAS, the Global Robotics And Automation Society, brings students, professionals, institutions and industry together through membership, college and school chapters, live sessions, events and opportunities in robotics and automation. This number sends account codes and updates. For help, write to " +
              (org.email || "connect@graas.org.in") +
              ".",
          512,
        ),
        email: text(org.email || "connect@graas.org.in", 128),
        websites: ["https://graas.org.in"],
        vertical: "EDU",
      };
      if (org.address) profile.address = text(org.address, 256);
      const r = await graph(m, "POST", `${pid}/whatsapp_business_profile`, profile);
      if (!r.ok) return fail(graphError(r));
      await audit("whatsapp_profile_updated", "whatsapp", String(pid));
      return out({ ok: true });
    }

    case "wa_reply": {
      // A staff reply from the admin inbox. WhatsApp allows free text only within 24 hours of the person's last message.
      if (!is("communications", "support", "membership_desk")) return fail("Your role cannot reply on WhatsApp.");
      const wa = String(b.wa_id ?? "").replace(/\D/g, "");
      const body = String(b.text ?? "").trim().slice(0, 4096);
      if (!/^[0-9]{8,15}$/.test(wa)) return fail("Choose a chat first.");
      if (body.length < 1) return fail("Write a reply first.", { field: "reply" });
      const w = (await admin.rpc("svc_wa_window", { p_wa: wa })).data;
      if (!w?.ok) return fail("This chat was not found.");
      if (!w.open) return fail("More than 24 hours have passed since their last message, so WhatsApp allows only approved templates. Email them instead, or wait for them to write again.");
      const m = await loadMessaging(admin);
      if (!m.wa_token || !m.whatsapp?.phone_number_id) return fail("WhatsApp is not set up.");
      const g = await graph(m, "POST", `${m.whatsapp.phone_number_id}/messages`, {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: wa,
        type: "text",
        text: { body, preview_url: true },
      });
      await admin.rpc("svc_wa_record_out", {
        p_wa: wa,
        p_body: body,
        p_provider: g.ok ? g.j?.messages?.[0]?.id ?? null : null,
        p_ok: g.ok,
        p_error: g.ok ? null : graphError(g),
        p_actor: user.id,
        p_auto: false,
      });
      return g.ok ? out({ ok: true }) : fail(graphError(g));
    }

    default:
      return fail("Unknown action.");
  }
});
