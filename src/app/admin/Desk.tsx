"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { portal } from "@/lib/browser";
import { inr, shortDate } from "@/lib/money";
import { POLICY_DEFAULTS, type Policy } from "@/lib/policy-defaults";
import { Badge, Msg, Stat, type Tone, lbl, refreshSite, sb, small } from "./shared";

/* ---------- Dashboard ---------- */

export function Dashboard({ go }: { go: (tab: string) => void }) {
  const [d, setD] = useState<any>(null);
  const [extra, setExtra] = useState<{ docs: number; experts: number; sessions: number; opps: number }>({ docs: 0, experts: 0, sessions: 0, opps: 0 });
  useEffect(() => {
    sb()
      .rpc("staff_dashboard")
      .then(({ data }) => setD(data));
    // Platform queues the dashboard function does not count yet. Each count is visible only to the roles that can act on it.
    const n = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
    Promise.all([
      n(sb().from("member_documents").select("id", { count: "exact", head: true }).eq("verify_status", "requested")),
      n(sb().from("experts").select("user_id", { count: "exact", head: true }).eq("status", "pending")),
      n(sb().from("events").select("id", { count: "exact", head: true }).eq("status", "pending")),
      n(sb().from("opportunities").select("id", { count: "exact", head: true }).eq("status", "pending")),
    ]).then(([docs, experts, sessions, opps]) => setExtra({ docs, experts, sessions, opps }));
  }, []);
  if (!d) return <p className="text-ink2">Loading…</p>;
  const g = d.gateway ?? {};
  const checks: { ok: boolean; text: string; tab: string }[] = [
    { ok: d.fees_missing === 0, text: d.fees_missing === 0 ? "Every published plan has a fee" : `${d.fees_missing} plan${d.fees_missing === 1 ? " has" : "s have"} no fee yet, so nobody can pay for ${d.fees_missing === 1 ? "it" : "them"}`, tab: "plans" },
    { ok: !!(g.key_id && g.has_secret), text: g.key_id && g.has_secret ? `Razorpay keys saved (${g.mode} mode)` : "Razorpay keys not entered", tab: "gateway" },
    { ok: !!g.enabled, text: g.enabled ? "Online payment is switched on" : "Online payment is switched off", tab: "gateway" },
    { ok: !!g.has_webhook_secret, text: g.has_webhook_secret ? "Webhook secret saved" : "Webhook not set up (protects against missed payments)", tab: "gateway" },
    { ok: !!(d.org?.email && d.org?.phone && d.org?.address), text: d.org?.email && d.org?.phone && d.org?.address ? "Official contact details filled in" : "Official email, phone and address not filled in (shown on receipts)", tab: "settings" },
    { ok: d.policies_saved > 0, text: d.policies_saved > 0 ? "Policies reviewed and saved by staff" : "Policies are still the starting drafts. Read and save each one", tab: "policies" },
  ];
  const todo: [number, string, string][] = [
    [d.pending_approval, "applications to verify", "members"],
    [d.chapters_waiting ?? 0, "chapter applications to approve", "chapters"],
    [d.roster_waiting ?? 0, "chapter students to approve", "chapters"],
    [d.roster_failed ?? 0, "chapter logins that need attention", "chapters"],
    [d.refund_requests, "refunds waiting", "payments"],
    [d.needs_review, "payments to check", "payments"],
    [d.open_tickets, "help requests to answer", "helpdesk"],
    [d.enquiries_new, "new enquiries", "leads"],
    [extra.docs, "certificates to verify", "documents"],
    [extra.experts, "requests to host sessions", "events"],
    [extra.sessions, "sessions and events to approve", "events"],
    [extra.opps, "opportunity posts to approve", "opportunities"],
  ];
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active members" value={d.active} note={`${d.applied_7d} applied in the last 7 days`} />
        <Stat label="Awaiting payment" value={d.pending_payment} />
        <Stat label="To verify" value={d.pending_approval} note={d.pending_approval ? "Needs staff action" : undefined} tone="warn" />
        <Stat label="Expiring in 30 days" value={d.expiring_30} note={d.expired ? `${d.expired} already expired` : undefined} tone="warn" />
        <Stat label="Collected this month" value={inr(d.collected_month_paise)} />
        <Stat label="Collected in total" value={inr(d.collected_paise)} note={`${d.paid_orders} payments`} />
        <Stat label="Accounts created" value={d.accounts} />
        <Stat label="Suspended" value={d.suspended} />
        <Stat label="Chapters" value={d.chapters_active ?? 0} note={d.chapters_waiting ? `${d.chapters_waiting} waiting for approval` : undefined} tone="warn" />
        <Stat label="School students" value={d.by_audience?.school ?? 0} note="Free, through school chapters" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="plate p-5 sm:p-6">
          <h3 className="text-xl font-semibold">Needs attention</h3>
          <ul className="mt-3 grid gap-2">
            {todo.filter(([n]) => n > 0).map(([n, label, tab]) => (
              <li key={label}>
                <button type="button" className="flex w-full items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-left font-medium hover:border-ink" onClick={() => go(tab)}>
                  <span>
                    <span className="readout mr-2 text-lg">{n}</span>
                    {label}
                  </span>
                  <span className="dot" />
                </button>
              </li>
            ))}
            {todo.every(([n]) => n === 0) && <li className="text-ink2">Nothing is waiting.</li>}
          </ul>
        </div>
        <div className="plate p-5 sm:p-6">
          <h3 className="text-xl font-semibold">Ready-to-collect checklist</h3>
          <ul className="mt-3 grid gap-2">
            {checks.map((c) => (
              <li key={c.text}>
                <button type="button" className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-cobalt-soft" onClick={() => go(c.tab)}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${c.ok ? "bg-go text-ink" : "border-2 border-line"}`}>
                    {c.ok && (
                      <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
                        <path d="M2.5 7.5 5.8 10.5 11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className={c.ok ? "text-ink2" : "font-semibold"}>{c.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-sm text-ink2">
        Active members by type:{" "}
        {["student", "professional", "institution", "industry"].map((a) => `${a} ${d.by_audience?.[a] ?? 0}`).join(", ")}. Figures as of {shortDate(d.as_of)}.
      </p>
    </div>
  );
}

/* ---------- Policies ---------- */

export function Policies({ session }: { session: Session }) {
  const [saved, setSaved] = useState<Record<string, Policy>>({});
  const [edit, setEdit] = useState<Policy | null>(null);
  const [msg, setMsg] = useState<{ tone: Tone; text: string } | null>(null);
  const load = useCallback(async () => {
    const { data } = await sb().from("policies").select("slug,title,summary,body,effective_on");
    setSaved(Object.fromEntries((data ?? []).map((p: any) => [p.slug, p])));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const { error } = await sb().from("policies").upsert({ ...edit, is_published: true, updated_by: session.user.id });
    if (error) return setMsg({ tone: "bad", text: error.message });
    await refreshSite(session);
    setEdit(null);
    setMsg({ tone: "good", text: "Policy saved and published on the website." });
    load();
  }
  async function restore(slug: string) {
    await sb().from("policies").delete().eq("slug", slug);
    await refreshSite(session);
    setEdit(null);
    setMsg({ tone: "good", text: "The starting text is back in use." });
    load();
  }

  if (edit)
    return (
      <form onSubmit={save} className="plate grid max-w-4xl gap-4 p-5 sm:p-6">
        <h3 className="text-xl font-semibold">Edit: {edit.title}</h3>
        <label className={lbl}>
          Title
          <input className="field" value={edit.title} maxLength={100} onChange={(e) => setEdit({ ...edit, title: e.target.value })} required />
        </label>
        <label className={lbl}>
          One-line summary
          <input className="field" value={edit.summary} maxLength={200} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} />
        </label>
        <label className={lbl}>
          In effect from
          <input className="field max-w-52" type="date" value={edit.effective_on} onChange={(e) => setEdit({ ...edit, effective_on: e.target.value })} required />
        </label>
        <label className={lbl}>
          Text
          <textarea className="field min-h-[28rem] font-mono text-sm leading-relaxed" value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} required />
          <span className="text-xs font-normal text-ink2">Start a line with ## for a heading and with - for a point. Any other line is a paragraph.</span>
        </label>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-go !min-h-10 !py-2">Save and publish</button>
          <button type="button" className="btn btn-quiet !min-h-10 !py-2" onClick={() => setEdit(null)}>
            Cancel
          </button>
          {saved[edit.slug] && POLICY_DEFAULTS.some((d) => d.slug === edit.slug) && (
            <button type="button" className="btn btn-quiet !min-h-10 !py-2" onClick={() => restore(edit.slug)}>
              Go back to the starting text
            </button>
          )}
        </div>
      </form>
    );

  return (
    <div className="grid gap-4">
      <p className="max-w-3xl text-ink2">These are shown on the website and accepted by every member at sign-up. The starting text was drafted for GRAAS; read each one, correct it, set the date and save. Have the refund policy and terms checked by your legal adviser.</p>
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
      <ul className="grid gap-2">
        {POLICY_DEFAULTS.map((d) => {
          const p = saved[d.slug] ?? d;
          return (
            <li key={d.slug} className="plate-soft flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span>
                <span className="font-semibold">{p.title}</span>
                <span className="block text-sm text-ink2">
                  In effect from {shortDate(p.effective_on)}. {p.summary}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Badge tone={saved[d.slug] ? "good" : "warn"}>{saved[d.slug] ? "Saved by staff" : "Starting draft"}</Badge>
                <a className={small} href={`/policies/${d.slug}`} target="_blank">
                  View
                </a>
                <button type="button" className={small} onClick={() => setEdit({ ...p })}>
                  Edit
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Help requests ---------- */

export function Helpdesk({ session }: { session: Session }) {
  const [rows, setRows] = useState<any[]>([]);
  const [show, setShow] = useState("open");
  const [reply, setReply] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const { data } = await sb().from("tickets").select("*, profile:profiles(full_name,email,phone)").order("created_at", { ascending: false }).limit(500);
    setRows(data ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function answer(id: string, close = false) {
    const text = (reply[id] ?? "").trim();
    if (!close && text.length < 2) return;
    await sb()
      .from("tickets")
      .update(close && !text ? { status: "closed" } : { reply: text, status: close ? "closed" : "answered", replied_by: session.user.id, replied_at: new Date().toISOString() })
      .eq("id", id);
    setReply((r) => ({ ...r, [id]: "" }));
    load();
  }
  const shown = rows.filter((t) => show === "all" || t.status === show);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-ink2">Messages members send from the Help section of their account. Your reply appears there.</p>
        <select className="field !min-h-10 w-auto" value={show} onChange={(e) => setShow(e.target.value)} aria-label="Show">
          <option value="open">Waiting for reply</option>
          <option value="answered">Answered</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
        </select>
      </div>
      <ul className="grid gap-3">
        {shown.map((t) => (
          <li key={t.id} className="plate p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{t.subject}</p>
                <p className="text-sm text-ink2">
                  {t.profile?.full_name}, {t.profile?.email}, {t.profile?.phone}, {shortDate(t.created_at)}
                </p>
              </div>
              <Badge tone={t.status === "open" ? "warn" : t.status === "answered" ? "good" : "plain"}>{t.status === "open" ? "Waiting" : t.status}</Badge>
            </div>
            <p className="mt-3 whitespace-pre-line">{t.message}</p>
            {t.reply && <p className="mt-3 whitespace-pre-line rounded-xl bg-cobalt-soft p-3 text-[0.95rem]">Reply sent {shortDate(t.replied_at)}: {t.reply}</p>}
            {t.status !== "closed" && (
              <div className="mt-3 grid gap-2">
                <textarea className="field min-h-20" placeholder={t.reply ? "Replace the reply" : "Write a reply"} value={reply[t.id] ?? ""} maxLength={2000} onChange={(e) => setReply((r) => ({ ...r, [t.id]: e.target.value }))} aria-label="Reply" />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={small} onClick={() => answer(t.id)}>
                    Send reply
                  </button>
                  <button type="button" className={small} onClick={() => answer(t.id, true)}>
                    {(reply[t.id] ?? "").trim() ? "Reply and close" : "Close"}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
        {shown.length === 0 && <li className="plate-soft px-4 py-10 text-center text-ink2">Nothing here.</li>}
      </ul>
    </div>
  );
}

/* ---------- Staff ---------- */

const ROLES: [string, string][] = [
  ["super_admin", "Super admin: everything, including staff, keys and settings"],
  ["membership_desk", "Membership desk: verify, suspend and close memberships, reset member passwords"],
  ["finance", "Finance: fees, coupons, payments and refunds"],
  ["communications", "Communications: updates, gallery and policies"],
  ["support", "Support: enquiries and help requests"],
  ["chapter_manager", "Chapter manager (for the chapters module)"],
  ["event_manager", "Event manager (for the events module)"],
  ["regional_coordinator", "Regional coordinator (read access)"],
  ["moderator", "Moderator (for the community module)"],
];

export function Staff({ session }: { session: Session }) {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ tone: Tone; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data: staff } = await sb().from("staff_members").select("*").order("created_at");
    const ids = (staff ?? []).map((s: any) => s.user_id);
    const { data: profiles } = ids.length ? await sb().from("profiles").select("id,full_name,email").in("id", ids) : { data: [] };
    const by = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
    setRows((staff ?? []).map((s: any) => ({ ...s, profile: by[s.user_id] })));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, p: Record<string, unknown>) {
    const { error } = await sb().from("staff_members").update(p).eq("user_id", id);
    if (error) setMsg({ tone: "bad", text: error.message });
    load();
  }
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    const r = await portal("staff_create", { email: f.get("email"), full_name: f.get("full_name"), role: f.get("role"), password: f.get("password") });
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "bad", text: r.error ?? "Could not add the staff member." });
    form.reset();
    setMsg({ tone: "good", text: "Staff account created. Give them the email and first password, and ask them to change it in Admin, under My login." });
    load();
  }

  return (
    <div className="grid gap-6">
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
      <ul className="grid gap-2">
        {rows.map((s) => {
          const me = s.user_id === session.user.id;
          return (
            <li key={s.user_id} className={`plate-soft flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${s.is_active ? "" : "opacity-60"}`}>
              <span>
                <span className="font-semibold">{s.profile?.full_name ?? s.profile?.email}</span>
                {me && <span className="ml-2 text-sm text-ink2">(you)</span>}
                <span className="block text-sm text-ink2">{s.profile?.email}</span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <select className="field !min-h-9 w-auto !py-1 text-sm" value={s.role} disabled={me} onChange={(e) => patch(s.user_id, { role: e.target.value })} aria-label="Role">
                  {ROLES.map(([r]) => (
                    <option key={r} value={r}>
                      {r.replace("_", " ")}
                    </option>
                  ))}
                </select>
                {!me && (
                  <button type="button" className={small} onClick={() => patch(s.user_id, { is_active: !s.is_active })}>
                    {s.is_active ? "Switch off access" : "Switch on access"}
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <form onSubmit={create} className="plate grid gap-4 p-5 sm:grid-cols-2 sm:p-6" autoComplete="off">
        <h3 className="text-xl font-semibold sm:col-span-2">Add a staff member</h3>
        <label className={lbl}>
          Full name
          <input name="full_name" className="field !min-h-10" maxLength={80} required />
        </label>
        <label className={lbl}>
          Email (must not already have an account)
          <input name="email" type="email" className="field !min-h-10" autoComplete="off" required />
        </label>
        <label className={lbl}>
          Role
          <select name="role" className="field !min-h-10" defaultValue="membership_desk">
            {ROLES.map(([r, d]) => (
              <option key={r} value={r}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className={lbl}>
          First password (they change it after signing in)
          <input name="password" type="password" className="field !min-h-10" autoComplete="new-password" minLength={8} required />
        </label>
        <div className="sm:col-span-2">
          <button className="btn btn-go !min-h-10 !py-2" disabled={busy}>
            Create staff account
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Activity log ---------- */

export function Activity() {
  const [rows, setRows] = useState<any[]>([]);
  const [who, setWho] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const { data } = await sb().from("audit_log").select("id,actor,action,entity,entity_id,created_at").order("id", { ascending: false }).limit(300);
      setRows(data ?? []);
      const ids = [...new Set((data ?? []).map((r: any) => r.actor).filter(Boolean))];
      if (ids.length) {
        const { data: p } = await sb().from("profiles").select("id,email").in("id", ids);
        setWho(Object.fromEntries((p ?? []).map((x: any) => [x.id, x.email])));
      }
    })();
  }, []);
  return (
    <div>
      <p className="max-w-2xl text-ink2">The latest 300 changes to memberships, fees, coupons, refunds, policies, updates, gallery and settings. Entries cannot be edited.</p>
      <div className="plate mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-ink2">
            <tr>
              {["When", "Who", "What", "Where", "Record"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap px-4 py-2.5">{new Date(r.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</td>
                <td className="px-4 py-2.5">{r.actor ? (who[r.actor] ?? "staff") : "system or member"}</td>
                <td className="px-4 py-2.5 font-medium">{r.action}</td>
                <td className="px-4 py-2.5">{r.entity.replace("_", " ")}</td>
                <td className="readout px-4 py-2.5 text-xs text-ink2">{r.entity_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
