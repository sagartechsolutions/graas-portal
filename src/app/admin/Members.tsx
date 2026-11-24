"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import { portal } from "@/lib/browser";
import { STATUS_LABEL, effectiveStatus, inr, shortDate } from "@/lib/money";
import { usePhoto } from "@/components/member/Details";
import { Badge, Msg, STATUS_TONE, downloadCsv, istToday, lbl, sb, small } from "./shared";

type Row = { id: string; user_id: string; status: string; member_no: string | null; organisation: string | null; applied_at: string; approved_at: string | null; activated_at: string | null; starts_on: string | null; ends_on: string | null; is_complimentary: boolean; staff_note: string | null; decision_reason: string | null; profile: any; plan: any };

const FILTERS = [
  ["all", "All"],
  ["pending_approval", "To verify"],
  ["pending_payment", "Awaiting payment"],
  ["active", "Active"],
  ["expiring", "Expiring in 30 days"],
  ["expired", "Expired"],
  ["suspended", "Suspended"],
  ["rejected", "Not approved"],
  ["cancelled", "Closed"],
] as const;

const ACTIONS: Record<string, { label: string; needs: "none" | "note" | "months"; hint: string; superOnly?: boolean; when: string[] }> = {
  approve: { label: "Approve application", needs: "none", hint: "The applicant can then pay.", when: ["pending_approval"] },
  reject: { label: "Reject application", needs: "note", hint: "Reason, shown to the applicant", when: ["pending_approval", "pending_payment"] },
  complimentary: { label: "Activate without payment", needs: "note", hint: "Why this membership is free of charge (kept on record)", superOnly: true, when: ["pending_approval", "pending_payment"] },
  suspend: { label: "Suspend", needs: "note", hint: "Reason, shown to the member", when: ["active"] },
  reinstate: { label: "Reinstate", needs: "none", hint: "The membership becomes active again.", when: ["suspended"] },
  extend: { label: "Extend validity", needs: "months", hint: "Why it is being extended (kept on record)", when: ["active", "suspended"] },
  cancel: { label: "Close membership", needs: "note", hint: "Reason, shown to the member", when: ["pending_approval", "pending_payment", "active", "suspended"] },
};

function Detail({ row, role, today, onBack, onChanged }: { row: Row; role: string; today: string; onBack: () => void; onChanged: () => void }) {
  const p = row.profile ?? {};
  const state = effectiveStatus(row, today);
  const [orders, setOrders] = useState<any[]>([]);
  const [act, setAct] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [months, setMonths] = useState("12");
  const [staffNote, setStaffNote] = useState(row.staff_note ?? "");
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [pw, setPw] = useState("");
  const [askDelete, setAskDelete] = useState(false);
  const canAct = role === "super_admin" || role === "membership_desk";

  useEffect(() => {
    sb()
      .from("orders")
      .select("id,plan_name,term_label,kind,purpose,total_paise,refunded_paise,status,receipt_no,paid_at,created_at,needs_review")
      .eq("user_id", row.user_id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders(data ?? []));
  }, [row.user_id]);

  async function run(action: string, n: string | null = null, m: number | null = null) {
    setMsg(null);
    const { data, error } = await sb().rpc("staff_membership_action", { p_id: row.id, p_action: action, p_note: n, p_months: m });
    if (error || !data?.ok) return setMsg({ tone: "bad", text: data?.error ?? error?.message ?? "That did not work." });
    setAct(null);
    setNote("");
    setMsg({ tone: "good", text: action === "note" ? "Note saved." : "Done." });
    onChanged();
  }
  async function setPassword() {
    setMsg(null);
    const r = await portal("set_password", { user_id: row.user_id, password: pw });
    setPw("");
    setMsg(r.ok ? { tone: "good", text: "Temporary password set. Tell the member by phone, and ask them to change it after signing in." } : { tone: "bad", text: r.error ?? "Could not set the password." });
  }
  async function remove() {
    const r = await portal("delete_member", { user_id: row.user_id });
    if (!r.ok) return setMsg({ tone: "bad", text: r.error ?? "Could not delete the account." });
    onChanged();
    onBack();
  }

  const item = (k: string, v: React.ReactNode) => (
    <div>
      <dt className="text-xs text-ink2">{k}</dt>
      <dd className="break-words font-medium">{v || "—"}</dd>
    </div>
  );
  const photo = usePhoto(row.user_id, p.photo_updated_at);
  const available = Object.entries(ACTIONS).filter(([, a]) => a.when.includes(row.status) && (!a.superOnly || role === "super_admin"));

  return (
    <div className="grid gap-5">
      <button type="button" className="link justify-self-start" onClick={onBack}>
        Back to members
      </button>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mist text-slate5 ring-1 ring-line">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-1 text-center text-[0.65rem] font-medium leading-tight">No photo</span>
          )}
        </span>
        <h3 className="text-2xl font-semibold tracking-tight">{p.full_name ?? p.email}</h3>
        <Badge tone={STATUS_TONE[state]}>{STATUS_LABEL[state]}</Badge>
        {row.is_complimentary && <Badge>No fee charged</Badge>}
      </div>
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="plate p-5">
          <h4 className="font-semibold">Person</h4>
          <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 text-[0.95rem]">
            {item("Email", p.email)}
            {item(
              "Mobile",
              p.phone && (
                <a className="underline" href={`https://wa.me/91${p.phone}`} target="_blank" rel="noopener noreferrer">
                  {p.phone}
                </a>
              ),
            )}
            {item("Date of birth", shortDate(p.dob))}
            {item("City and state", [p.city, p.state].filter(Boolean).join(", "))}
            {item("Gender", p.gender)}
            {item("School, college, institution or company", p.organisation ?? row.organisation)}
            {row.plan?.audience === "student" ? item("Course", p.course) : item("Designation", p.designation)}
            {row.plan?.audience === "student" && item("Branch", p.branch)}
            {row.plan?.audience === "student" && item("Year of study", p.study_year)}
            {p.guardian_name && item("Parent or guardian", `${p.guardian_name}, ${p.guardian_phone ?? ""}${p.guardian_consent_at ? ` (agreed ${shortDate(p.guardian_consent_at)})` : ""}`)}
            {item("Website", p.website)}
            {item("Account created", shortDate(p.created_at))}
            {item("Invite code", p.referral_code)}
            {item("Invited by code", p.referred_by)}
          </dl>
        </div>
        <div className="plate p-5">
          <h4 className="font-semibold">Membership</h4>
          <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 text-[0.95rem]">
            {item("Plan", row.plan?.name)}
            {item("Member number", <span className="readout">{row.member_no}</span>)}
            {item("Applied", shortDate(row.applied_at))}
            {item("Verified", shortDate(row.approved_at))}
            {item("Active from", shortDate(row.starts_on))}
            {item("Valid until", row.status === "active" && !row.ends_on ? "No end date" : shortDate(row.ends_on))}
            {item("Reason on record", row.decision_reason)}
          </dl>
          <label className={`${lbl} mt-4`}>
            Staff note (not shown to the member)
            <textarea className="field min-h-20" value={staffNote} onChange={(e) => setStaffNote(e.target.value)} disabled={!canAct} />
          </label>
          {canAct && (
            <button type="button" className={`${small} mt-2`} onClick={() => run("note", staffNote)}>
              Save note
            </button>
          )}
        </div>
      </div>

      {canAct && (
        <div className="plate grid gap-4 p-5">
          <h4 className="font-semibold">Actions</h4>
          <div className="flex flex-wrap gap-2">
            {available.map(([k, a]) => (
              <button key={k} type="button" className={`${small} ${act === k ? "!border-ink" : ""}`} onClick={() => (a.needs === "none" ? run(k) : setAct(act === k ? null : k))}>
                {a.label}
              </button>
            ))}
            {available.length === 0 && <p className="text-sm text-ink2">This membership is closed. The person can apply again from their account.</p>}
          </div>
          {act && ACTIONS[act].needs !== "none" && (
            <div className="grid gap-3 rounded-2xl bg-cobalt-soft p-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                {ACTIONS[act].needs === "months" && (
                  <label className={lbl}>
                    Months to add
                    <input className="field !min-h-10 w-28" type="number" min={1} max={60} value={months} onChange={(e) => setMonths(e.target.value)} />
                  </label>
                )}
                <label className={`${lbl} ${ACTIONS[act].needs === "months" ? "" : "sm:col-span-2"}`}>
                  {ACTIONS[act].hint}
                  <input className="field !min-h-10" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
                </label>
              </div>
              <button type="button" className="btn btn-go !min-h-10 !py-2" onClick={() => run(act, note, ACTIONS[act].needs === "months" ? Number(months) : null)}>
                {ACTIONS[act].label}
              </button>
            </div>
          )}
          <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className={lbl}>
              Set a temporary password (when a member cannot sign in, after you have checked who they are)
              <input className="field !min-h-10 max-w-sm" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" />
            </label>
            <button type="button" className={small} onClick={setPassword} disabled={pw.length < 8}>
              Set password
            </button>
          </div>
          {role === "super_admin" && (
            <div className="border-t border-line pt-4">
              {askDelete ? (
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  Delete this account and its membership for good? Payment records are kept.
                  <button type="button" className={small} onClick={remove}>
                    Yes, delete
                  </button>
                  <button type="button" className={small} onClick={() => setAskDelete(false)}>
                    Keep
                  </button>
                </p>
              ) : (
                <button type="button" className={small} onClick={() => setAskDelete(true)}>
                  Delete account
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="plate p-5">
        <h4 className="font-semibold">Payments by this person</h4>
        {orders.length === 0 && <p className="mt-2 text-sm text-ink2">None yet.</p>}
        <ul className="mt-3 grid gap-2">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-2.5 text-[0.95rem]">
              <span>
                {o.plan_name}, {o.term_label ?? "1 year"} ({o.purpose === "change" ? "type change" : o.kind}), {shortDate(o.paid_at ?? o.created_at)}
                {o.receipt_no ? `, ${o.receipt_no}` : ""}
              </span>
              <span className="flex items-center gap-3">
                <span className="readout">{inr(o.total_paise)}</span>
                <Badge tone={o.status === "paid" ? "good" : o.status === "created" ? "plain" : o.status === "refunded" ? "plain" : "bad"}>{o.status}</Badge>
                {o.needs_review && <Badge tone="warn">Check</Badge>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Members({ role }: { role: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("all");
  const [aud, setAud] = useState("");
  const [course, setCourse] = useState("");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [gender, setGender] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const today = useMemo(() => istToday(), []);
  const soon = useMemo(() => new Date(new Date(today).getTime() + 30 * 86400000).toISOString().slice(0, 10), [today]);

  const load = useCallback(async () => {
    const { data, error } = await sb()
      .from("memberships")
      .select("*, profile:profiles(*), plan:membership_plans(code,name,audience,price_inr,duration_months,requires_approval)")
      .order("applied_at", { ascending: false })
      .limit(3000);
    if (error) setErr(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const match = useCallback(
    (r: Row, f: string) => {
      const s = effectiveStatus(r, today);
      if (f === "all") return true;
      if (f === "expiring") return s === "active" && !!r.ends_on && r.ends_on <= soon;
      return s === f;
    },
    [today, soon],
  );
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => match(r, filter) && (!aud || r.plan?.audience === aud) && (!course || r.profile?.course === course) && (!branch || r.profile?.branch === branch) && (!year || r.profile?.study_year === year) && (!gender || r.profile?.gender === gender) && (!s || [r.profile?.full_name, r.profile?.email, r.profile?.phone, r.member_no, r.organisation, r.profile?.city].some((v) => String(v ?? "").toLowerCase().includes(s))));
  }, [rows, filter, aud, course, branch, year, gender, q, match]);
  const values = (k: string) => [...new Set(rows.map((r) => r.profile?.[k]).filter(Boolean))].sort() as string[];
  const tally = (k: string) => {
    const m = new Map<string, number>();
    for (const r of shown) if (r.profile?.[k]) m.set(r.profile[k], (m.get(r.profile[k]) ?? 0) + 1);
    return [...m.entries()].sort((x, y) => y[1] - x[1]);
  };

  const open = rows.find((r) => r.id === openId);
  if (open) return <Detail key={open.id} row={open} role={role} today={today} onBack={() => setOpenId(null)} onChanged={load} />;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([id, label]) => {
          const n = rows.filter((r) => match(r, id)).length;
          return (
            <button key={id} type="button" onClick={() => setFilter(id)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${filter === id ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"}`}>
              {label} <span className="readout opacity-70">{n}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className={`${lbl} min-w-56 flex-1`}>
          Search
          <input className="field !min-h-10" placeholder="Name, email, mobile, member number, college or city" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className={lbl}>
          Type
          <select className="field !min-h-10" value={aud} onChange={(e) => setAud(e.target.value)}>
            <option value="">All types</option>
            <option value="student">Student</option>
            <option value="professional">Professional</option>
            <option value="institution">Institution</option>
            <option value="industry">Industry</option>
          </select>
        </label>
        {[
          ["Course", course, setCourse, "course"],
          ["Branch", branch, setBranch, "branch"],
          ["Year", year, setYear, "study_year"],
          ["Gender", gender, setGender, "gender"],
        ].map(([label, val, set, key]) => (
          <label key={label as string} className={lbl}>
            {label as string}
            <select className="field !min-h-10 max-w-52" value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)}>
              <option value="">All</option>
              {values(key as string).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        ))}
        <button
          type="button"
          className="btn btn-quiet !min-h-10 !py-2"
          onClick={() =>
            downloadCsv("graas-members", [
              ["Member number", "Name", "Email", "Mobile", "Plan", "Status", "Gender", "Organisation", "Designation", "Course", "Branch", "Year of study", "Date of birth", "Parent or guardian", "Guardian mobile", "City", "State", "Applied", "Active from", "Valid until"],
              ...shown.map((r) => [r.member_no, r.profile?.full_name, r.profile?.email, r.profile?.phone, r.plan?.name, STATUS_LABEL[effectiveStatus(r, today)], r.profile?.gender, r.profile?.organisation ?? r.organisation, r.profile?.designation, r.profile?.course, r.profile?.branch, r.profile?.study_year, r.profile?.dob, r.profile?.guardian_name, r.profile?.guardian_phone, r.profile?.city, r.profile?.state, shortDate(r.applied_at), shortDate(r.starts_on), shortDate(r.ends_on)]),
            ])
          }
        >
          Download CSV
        </button>
      </div>
      {err && <p role="alert" className="mt-3 font-semibold text-[#8f1a11]">{err}</p>}
      <p className="mt-4 text-sm text-ink2">{loading ? "Loading…" : `Showing ${shown.length} of ${rows.length}`}</p>
      {shown.some((r) => r.profile?.course) && (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[
            ["By course", tally("course")],
            ["By branch", tally("branch")],
            ["By gender", tally("gender")],
          ].map(([t, list]) => (
            <div key={t as string} className="plate-soft p-4">
              <p className="text-sm font-semibold">{t as string}</p>
              <ul className="mt-2 grid gap-1 text-sm">
                {(list as [string, number][]).slice(0, 8).map(([k, n]) => (
                  <li key={k} className="flex justify-between gap-3">
                    <span className="truncate">{k}</span>
                    <span className="readout">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <div className="plate mt-2 overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-[0.95rem]">
          <thead className="border-b border-line text-sm text-ink2">
            <tr>
              {["Name", "Plan", "Status", "Member number", "Organisation", "City", "Applied", "Valid until"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const s = effectiveStatus(r, today);
              return (
                <tr key={r.id} className="cursor-pointer border-b border-line last:border-0 hover:bg-cobalt-soft" onClick={() => setOpenId(r.id)}>
                  <td className="px-4 py-3">
                    <button type="button" className="text-left font-semibold underline decoration-line underline-offset-4" onClick={() => setOpenId(r.id)}>
                      {r.profile?.full_name ?? r.profile?.email}
                    </button>
                    <span className="block text-sm text-ink2">{r.profile?.phone}</span>
                  </td>
                  <td className="px-4 py-3">{r.plan?.name}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[s]}>{STATUS_LABEL[s]}</Badge>
                  </td>
                  <td className="readout px-4 py-3 text-sm">{r.member_no ?? ""}</td>
                  <td className="px-4 py-3">{r.organisation ?? r.profile?.organisation}</td>
                  <td className="px-4 py-3">{r.profile?.city}</td>
                  <td className="px-4 py-3">{shortDate(r.applied_at)}</td>
                  <td className="px-4 py-3">{shortDate(r.ends_on)}</td>
                </tr>
              );
            })}
            {!loading && shown.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-ink2">
                  No members match. Applications appear here as soon as people join on the website.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
