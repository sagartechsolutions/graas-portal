"use client";

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { browserClient } from "@/lib/browser";
import { LEAD_KINDS } from "@/lib/site";
import { Gallery, Updates } from "./Content";

type PlanRow = {
  id: string;
  code: string;
  audience: string;
  name: string;
  tagline: string | null;
  duration_months: number | null;
  price_inr: number | null;
  gst_percent: number;
  benefits: string[];
  requires_approval: boolean;
  is_published: boolean;
  sort_order: number;
};
type Lead = {
  id: string;
  serial: number;
  kind: string;
  full_name: string;
  phone: string;
  email: string | null;
  organisation: string | null;
  city: string | null;
  interests: string[];
  message: string | null;
  status: string;
  source: string | null;
  referred_by: string | null;
  my_code: string;
  created_at: string;
};

const sb = () => browserClient();
const STATUSES = ["new", "contacted", "qualified", "converted", "lost"];
const kindLabel = (k: string) => LEAD_KINDS.find((x) => x.value === k)?.label ?? "Message";
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

async function refreshSite(session: Session) {
  await fetch("/api/revalidate", { method: "POST", headers: { authorization: `Bearer ${session.access_token}` } }).catch(() => {});
}

function SignIn() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setErr("");
    const { error } = await sb().auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("password")) });
    if (error) setErr("That email and password do not match a staff account.");
    setBusy(false);
  }
  return (
    <section className="blueprint">
      <div className="mx-auto max-w-md px-5 py-20">
        <h1 className="h-section">Staff sign-in</h1>
        <form onSubmit={submit} className="plate mt-8 grid gap-4 p-6">
          <label className="grid gap-1.5 font-semibold">
            Email
            <input name="email" type="email" className="field" autoComplete="username" required />
          </label>
          <label className="grid gap-1.5 font-semibold">
            Password
            <input name="password" type="password" className="field" autoComplete="current-password" required />
          </label>
          {err && (
            <p role="alert" className="font-semibold text-[#8f1a11]">
              {err}
            </p>
          )}
          <button className="btn btn-go justify-self-start" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </section>
  );
}

function Leads({ canEdit }: { canEdit: boolean }) {
  const [rows, setRows] = useState<Lead[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error, count } = await sb().from("leads").select("*", { count: "exact" }).order("serial", { ascending: false }).limit(1000);
    if (error) setErr(error.message);
    setRows((data ?? []) as Lead[]);
    setTotal(count ?? null);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!kind || r.kind === kind) &&
        (!s || [r.full_name, r.phone, r.email, r.organisation, r.city, r.my_code].some((v) => v?.toLowerCase().includes(s))),
    );
  }, [rows, q, kind]);

  async function setStatus(id: string, status: string) {
    const { error } = await sb().from("leads").update({ status }).eq("id", id);
    if (error) return setErr(error.message);
    setRows((v) => v.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  function exportCsv() {
    const cols = ["serial", "created_at", "kind", "full_name", "phone", "email", "organisation", "city", "interests", "status", "source", "referred_by", "my_code", "message"] as const;
    const esc = (v: unknown) => `"${String(Array.isArray(v) ? v.join("; ") : (v ?? "")).replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...shown.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = `graas-pre-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm font-semibold">
          Search
          <input className="field !min-h-10 w-64" placeholder="Name, mobile, college, city" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Type
          <select className="field !min-h-10" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Everyone</option>
            {LEAD_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
            <option value="other">Messages</option>
          </select>
        </label>
        <button type="button" className="btn btn-quiet !min-h-10 !py-2" onClick={exportCsv} disabled={!shown.length}>
          Download CSV
        </button>
        <button type="button" className="btn btn-quiet !min-h-10 !py-2" onClick={load}>
          Refresh
        </button>
        <p className="readout ml-auto text-sm text-ink2">
          Showing {shown.length} of {total ?? rows.length}
        </p>
      </div>
      {err && <p role="alert" className="mt-3 font-semibold text-[#8f1a11]">{err}</p>}
      <div className="plate-soft mt-5 overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-line bg-paper text-ink2">
            <tr>
              {["No.", "Date", "Name", "Type", "Mobile", "Email", "College or company", "City", "Interested in", "Status"].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-line align-top last:border-0">
                <td className="readout px-3 py-2.5">{String(r.serial).padStart(4, "0")}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                <td className="px-3 py-2.5 font-semibold">
                  {r.full_name}
                  {r.message && <p className="mt-1 max-w-xs font-normal text-ink2">{r.message}</p>}
                </td>
                <td className="px-3 py-2.5">{kindLabel(r.kind)}</td>
                <td className="readout px-3 py-2.5">
                  <a className="text-cobalt underline" href={`https://wa.me/91${r.phone}`} target="_blank" rel="noopener noreferrer">
                    {r.phone}
                  </a>
                </td>
                <td className="px-3 py-2.5">{r.email}</td>
                <td className="px-3 py-2.5">{r.organisation}</td>
                <td className="px-3 py-2.5">{r.city}</td>
                <td className="px-3 py-2.5">{r.interests.join(", ")}</td>
                <td className="px-3 py-2.5">
                  <select className="field !min-h-9 !py-1" value={r.status} disabled={!canEdit} onChange={(e) => setStatus(r.id, e.target.value)} aria-label={`Status for ${r.full_name}`}>
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {!loading && shown.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-ink2">
                  No pre-registrations match. New ones appear here as soon as people submit the form.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlanCard({ plan, session, onSaved }: { plan: PlanRow; session: Session; onSaved: () => void }) {
  const [p, setP] = useState(plan);
  const [price, setPrice] = useState(plan.price_inr === null ? "" : String(plan.price_inr));
  const [months, setMonths] = useState(plan.duration_months === null ? "" : String(plan.duration_months));
  const [benefits, setBenefits] = useState(plan.benefits.join("\n"));
  const [state, setState] = useState<"idle" | "saving" | "saved" | string>("idle");

  async function save() {
    const priceN = numOrNull(price), monthsN = numOrNull(months);
    if ((priceN !== null && (!Number.isFinite(priceN) || priceN < 0)) || (monthsN !== null && (!Number.isInteger(monthsN) || monthsN <= 0)))
      return setState("Price must be zero or more, and duration a whole number of months.");
    setState("saving");
    const { error } = await sb()
      .from("membership_plans")
      .update({
        name: p.name.trim(),
        tagline: p.tagline?.trim() || null,
        price_inr: priceN,
        duration_months: monthsN,
        gst_percent: p.gst_percent,
        benefits: benefits.split("\n").map((b) => b.trim()).filter(Boolean),
        requires_approval: p.requires_approval,
        is_published: p.is_published,
        sort_order: p.sort_order,
        updated_by: session.user.id,
      })
      .eq("id", p.id);
    if (error) return setState(error.message);
    await refreshSite(session);
    setState("saved");
    onSaved();
  }

  return (
    <div className="plate grid gap-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="readout text-xs text-ink2">
          {p.code} / {p.audience}
        </p>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-4 w-4 accent-[#067a2e]" checked={p.is_published} onChange={(e) => setP({ ...p, is_published: e.target.checked })} />
          Shown on website
        </label>
      </div>
      <label className="grid gap-1 text-sm font-semibold">
        Plan name
        <input className="field !min-h-10" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Short description
        <input className="field !min-h-10" value={p.tagline ?? ""} onChange={(e) => setP({ ...p, tagline: e.target.value })} />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="grid gap-1 text-sm font-semibold">
          Fee in ₹
          <input className="field !min-h-10" inputMode="decimal" placeholder="Not announced" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          GST %
          <input className="field !min-h-10" inputMode="decimal" value={p.gst_percent} onChange={(e) => setP({ ...p, gst_percent: Number(e.target.value) || 0 })} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Months
          <input className="field !min-h-10" inputMode="numeric" placeholder="Lifetime" value={months} onChange={(e) => setMonths(e.target.value)} />
        </label>
      </div>
      <p className="text-xs text-ink2">Leave the fee empty to show &quot;Fee to be announced&quot;. Leave months empty for a lifetime plan.</p>
      <label className="grid gap-1 text-sm font-semibold">
        Benefits, one per line
        <textarea className="field min-h-32" value={benefits} onChange={(e) => setBenefits(e.target.value)} />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="h-4 w-4 accent-[#067a2e]" checked={p.requires_approval} onChange={(e) => setP({ ...p, requires_approval: e.target.checked })} />
        Application is verified before payment
      </label>
      <div className="flex items-center gap-4">
        <button type="button" className="btn btn-go !min-h-10 !py-2" onClick={save} disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : "Save plan"}
        </button>
        <p className="text-sm" aria-live="polite">
          {state === "saved" ? <span className="font-semibold text-ok">Saved. The website now shows this.</span> : state !== "idle" && state !== "saving" ? <span className="font-semibold text-[#8f1a11]">{state}</span> : null}
        </p>
      </div>
    </div>
  );
}

function Plans({ session }: { session: Session }) {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb().from("membership_plans").select("*").order("sort_order");
    if (error) setErr(error.message);
    setPlans((data ?? []) as PlanRow[]);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim();
    const code = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!code) return;
    const { error } = await sb().from("membership_plans").insert({ code, name, audience: f.get("audience"), duration_months: 12, sort_order: (plans.at(-1)?.sort_order ?? 0) + 10, updated_by: session.user.id });
    if (error) return setErr(error.code === "23505" ? "A plan with that name already exists." : error.message);
    setErr("");
    e.currentTarget.reset();
    load();
  }

  return (
    <div>
      <p className="max-w-2xl text-ink2">Set the fee for each plan here. Nothing about price is fixed in the website code. Changes appear on the public Membership page as soon as you save.</p>
      {err && <p role="alert" className="mt-3 font-semibold text-[#8f1a11]">{err}</p>}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} session={session} onSaved={() => {}} />
        ))}
      </div>
      <form onSubmit={add} className="plate-soft mt-8 flex flex-wrap items-end gap-3 p-5">
        <label className="grid gap-1 text-sm font-semibold">
          New plan name
          <input name="name" className="field !min-h-10 w-64" placeholder="Student, 3 years" required />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          For
          <select name="audience" className="field !min-h-10">
            <option value="student">Students</option>
            <option value="professional">Professionals</option>
            <option value="institution">Institutions</option>
            <option value="industry">Industry</option>
          </select>
        </label>
        <button className="btn btn-quiet !min-h-10 !py-2">Add plan</button>
        <p className="w-full text-xs text-ink2">New plans start hidden with no fee. Fill them in, then tick &quot;Shown on website&quot;.</p>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <input className="field !min-h-10" placeholder={hint} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

type Json = Record<string, unknown>;

function Settings({ session }: { session: Session }) {
  const [org, setOrg] = useState<Json>({});
  const [con, setCon] = useState<Json>({});
  const [state, setState] = useState("");
  useEffect(() => {
    sb()
      .from("site_settings")
      .select("key,value")
      .in("key", ["org", "graascon"])
      .then(({ data }) => {
        for (const r of data ?? []) (r.key === "org" ? setOrg : setCon)(r.value as Json);
      });
  }, []);
  const str = (o: Json, k: string) => (typeof o[k] === "string" ? (o[k] as string) : "");
  const put = (set: typeof setOrg, k: string) => (v: string) => set((o) => ({ ...o, [k]: v.trim() === "" ? null : v }));

  async function save() {
    setState("Saving…");
    const stamp = { updated_by: session.user.id };
    const a = await sb().from("site_settings").update({ value: org, ...stamp }).eq("key", "org");
    const b = await sb().from("site_settings").update({ value: con, ...stamp }).eq("key", "graascon");
    if (a.error || b.error) return setState(a.error?.message ?? b.error?.message ?? "Could not save.");
    await refreshSite(session);
    setState("Saved.");
  }

  return (
    <div className="grid max-w-3xl gap-8">
      <div className="plate grid gap-3 p-5">
        <h3 className="text-xl font-semibold">GRAAS contact details</h3>
        <Field label="Official email" value={str(org, "email")} onChange={put(setOrg, "email")} />
        <Field label="Official phone" value={str(org, "phone")} onChange={put(setOrg, "phone")} />
        <Field label="Registered office address" value={str(org, "address")} onChange={put(setOrg, "address")} />
      </div>
      <div className="plate grid gap-3 p-5">
        <h3 className="text-xl font-semibold">GRAASCON</h3>
        <Field label="Dates" hint="For example 14 to 16 May 2027" value={str(con, "dates")} onChange={put(setCon, "dates")} />
        <Field label="Venue" value={str(con, "venue")} onChange={put(setCon, "venue")} />
        <Field label="Paper submission link" value={str(con, "cfp_url")} onChange={put(setCon, "cfp_url")} />
        <p className="text-xs text-ink2">Until dates are filled in, the website says &quot;Dates and venue will be announced here&quot;.</p>
      </div>
      <div className="flex items-center gap-4">
        <button type="button" className="btn btn-go !min-h-10 !py-2" onClick={save}>
          Save settings
        </button>
        <p className="text-sm font-semibold" aria-live="polite">
          {state}
        </p>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [role, setRole] = useState<string | null | undefined>(undefined);
  const [tab, setTab] = useState<"leads" | "updates" | "gallery" | "plans" | "settings">("leads");

  useEffect(() => {
    sb().auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb().auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) return setRole(undefined);
    sb()
      .from("staff_members")
      .select("role,is_active")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setRole(data?.is_active ? data.role : null));
  }, [session]);

  if (session === undefined) return <p className="px-5 py-20 text-center text-ink2">Loading…</p>;
  if (!session) return <SignIn />;
  if (role === undefined) return <p className="px-5 py-20 text-center text-ink2">Checking access…</p>;
  if (role === null)
    return (
      <section className="mx-auto max-w-xl px-5 py-20">
        <h1 className="h-section">No staff access</h1>
        <p className="lede mt-4">{session.user.email} is signed in but has not been given a staff role. Ask the GRAAS super admin to add you.</p>
        <button type="button" className="btn btn-quiet mt-6" onClick={() => sb().auth.signOut()}>
          Sign out
        </button>
      </section>
    );

  const canPrice = role === "super_admin" || role === "finance";
  const canPost = role === "super_admin" || role === "communications";
  const tabs = [
    { id: "leads", label: "Pre-registrations", show: true },
    { id: "updates", label: "Updates", show: canPost },
    { id: "gallery", label: "Gallery", show: canPost },
    { id: "plans", label: "Membership fees", show: canPrice },
    { id: "settings", label: "Settings", show: role === "super_admin" },
  ] as const;

  return (
    <section className="shell py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-section !text-4xl">GRAAS admin</h1>
          <p className="mt-1 text-sm text-ink2">
            {session.user.email} · {role.replace("_", " ")}
          </p>
        </div>
        <button type="button" className="btn btn-quiet !min-h-10 !py-2" onClick={() => sb().auth.signOut()}>
          Sign out
        </button>
      </div>
      <div role="tablist" className="mt-7 flex flex-wrap gap-2 border-b border-line pb-4">
        {tabs.filter((t) => t.show).map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-10 rounded-full border px-4 py-1.5 font-semibold ${tab === t.id ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-7">
        {tab === "leads" && <Leads canEdit={["super_admin", "support", "communications", "membership_desk"].includes(role)} />}
        {tab === "updates" && canPost && <Updates session={session} />}
        {tab === "gallery" && canPost && <Gallery session={session} />}
        {tab === "plans" && canPrice && <Plans session={session} />}
        {tab === "settings" && role === "super_admin" && <Settings session={session} />}
      </div>
    </section>
  );
}
