"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import { portal } from "@/lib/browser";
import { shortDate } from "@/lib/money";
import { Badge, Msg, downloadCsv, lbl, sb, small, type Tone } from "./shared";
import { ChapterAdd, ChapterManage } from "./Manage";

const STATUS: Record<string, [string, Tone]> = {
  draft: ["Being prepared", "plain"],
  submitted: ["Waiting for approval", "warn"],
  approved: ["Approved", "good"],
  rejected: ["Sent back", "bad"],
  suspended: ["Suspended", "bad"],
};
const ROW: Record<string, [string, Tone]> = {
  pending: ["Waiting for approval", "warn"],
  awaiting_payment: ["Needs payment", "warn"],
  ready: ["Login being set up", "plain"],
  provisioning: ["Login being set up", "plain"],
  active: ["Member", "good"],
  rejected: ["Not approved", "bad"],
  failed: ["Could not create", "bad"],
};
const label = (c: any) => `${c.institution}${c.kind === "college" ? `, ${c.branch === "Other" ? c.branch_other : c.branch} chapter` : " school chapter"}`;

function Chapter({ c, onBack, onChanged }: { c: any; onBack: () => void; onChanged: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [seats, setSeats] = useState(String(c.free_seats ?? 15));
  const [months, setMonths] = useState("12");
  const [msg, setMsg] = useState<{ tone: Tone; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [letter, setLetter] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    const { data } = await sb().from("chapter_members").select("*, membership:memberships(member_no,status), profile:profiles!chapter_members_user_id_fkey(must_change_password,photo_updated_at)").eq("chapter_id", c.id).neq("status", "removed").order("created_at");
    setRows(data ?? []);
  }, [c.id]);
  useEffect(() => {
    Promise.resolve().then(load);
    if (c.letter_path)
      sb()
        .storage.from("chapter-docs")
        .createSignedUrl(c.letter_path, 900)
        .then(({ data }) => setLetter(data?.signedUrl ?? null));
  }, [load, c.letter_path]);

  async function act(action: string, value?: number) {
    setMsg(null);
    setBusy(true);
    const { data, error } = await sb().rpc("staff_chapter_action", { p_id: c.id, p_action: action, p_note: note.trim() || null, p_value: value ?? null });
    setBusy(false);
    if (error || !data?.ok) return setMsg({ tone: "bad", text: data?.error ?? error?.message ?? "That did not work." });
    if (action === "approve") {
      setMsg({ tone: "good", text: "Approved. Setting up the students' logins…" });
      const r = await portal("chapter_provision", { chapter_id: c.id });
      setMsg({ tone: "good", text: r.ok ? `Approved. ${r.made ?? 0} logins set up and emailed${r.left ? `; ${r.left} more are on the way` : ""}.` : `Approved. Logins go out within a few minutes. (${r.error})` });
    } else setMsg({ tone: "good", text: "Saved." });
    setNote("");
    onChanged();
    load();
  }
  async function rowAct(action: string) {
    if (!picked.length) return setMsg({ tone: "bad", text: "Tick the students first." });
    setBusy(true);
    const { data, error } = await sb().rpc("staff_roster_action", { p_ids: picked, p_action: action, p_note: note.trim() || null });
    setBusy(false);
    if (error || !data?.ok) return setMsg({ tone: "bad", text: data?.error ?? error?.message ?? "That did not work." });
    setPicked([]);
    setMsg({ tone: "good", text: `${data.count} updated.` });
    if (action === "approve" || action === "retry") {
      const r = await portal("chapter_provision", { chapter_id: c.id });
      if (r.ok) setMsg({ tone: "good", text: `${data.count} updated; ${r.made ?? 0} logins set up and emailed${r.left ? `, ${r.left} more on the way` : ""}.` });
    }
    load();
    onChanged();
  }
  async function resend(id: string) {
    const r = await portal("chapter_resend", { row_id: id });
    setMsg(r.ok ? { tone: "good", text: `New first password sent to ${r.sent_to}.` } : { tone: "bad", text: r.error ?? "Could not send." });
    load();
  }
  const shown = rows.filter((r) => filter === "all" || r.status === filter || (filter === "notsent" && r.status === "active" && !r.login_sent_at));
  const counts = useMemo(() => rows.reduce((a: Record<string, number>, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {}), [rows]);
  const freeUsed = rows.filter((r) => r.seat === "free" && !["rejected", "failed"].includes(r.status)).length;

  return (
    <div className="grid gap-5">
      <button type="button" className="link justify-self-start text-sm" onClick={onBack}>
        Back to all chapters
      </button>
      {c.removed_at && <Msg tone="bad">This chapter was removed on {shortDate(String(c.removed_at).slice(0, 10))}. Restore it to work with it again.</Msg>}
      <ChapterManage c={c} onChanged={() => onChanged()} />
      <div className="plate grid gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xl font-semibold">{label(c)}</p>
            <p className="text-sm text-ink2">
              {c.kind === "school" ? "School chapter" : "College chapter"}, {c.city}, {c.state}
              {c.code ? `, ${c.code}` : ""}
            </p>
          </div>
          <Badge tone={STATUS[c.status]?.[1]}>{STATUS[c.status]?.[0]}</Badge>
        </div>
        <dl className="grid gap-x-6 gap-y-3 text-[0.95rem] sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Coordinator", `${c.head_name ?? ""}, ${c.head_designation ?? ""}`],
            ["Coordinator contact", `${c.head_email ?? ""}, ${c.head_phone ?? ""}`],
            ["Department", c.head_department ?? "—"],
            ["Principal", c.principal_name ?? "—"],
            ["Address", [c.address, c.pincode].filter(Boolean).join(", ") || "—"],
            ["Website", c.website ?? "—"],
            ["Sent to GRAAS", c.submitted_at ? shortDate(c.submitted_at) : "—"],
            ["Approved", c.approved_at ? shortDate(c.approved_at) : "—"],
            ["Valid until", c.valid_until ? shortDate(c.valid_until) : "—"],
            ["Free seats", c.kind === "school" ? "Every student" : `${freeUsed} of ${c.free_seats ?? 15} used`],
            ["Students", `${rows.length} on the list, ${counts.active ?? 0} members`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-ink2">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center gap-3">
          {letter ? (
            <a href={letter} target="_blank" rel="noopener noreferrer" className="btn btn-go">
              Open the principal&apos;s letter
            </a>
          ) : (
            <Badge tone="bad">No letter uploaded</Badge>
          )}
          {c.decision_reason && <span className="text-sm text-ink2">Last reason given: {c.decision_reason}</span>}
        </div>
        {c.staff_note && <p className="whitespace-pre-line rounded-xl bg-mist px-4 py-3 text-sm">{c.staff_note}</p>}
        <label className={lbl}>
          Note or reason (the coordinator sees a reason when you send back or suspend)
          <textarea className="field min-h-20" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </label>
        <div className="flex flex-wrap gap-2">
          {c.status === "submitted" && (
            <>
              <button type="button" className="btn btn-go" disabled={busy} onClick={() => act("approve")}>
                Approve chapter and its students
              </button>
              <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => act("reject")}>
                Send back with the reason
              </button>
            </>
          )}
          {c.status === "approved" && (
            <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => act("suspend")}>
              Suspend
            </button>
          )}
          {c.status === "suspended" && (
            <button type="button" className="btn btn-go" disabled={busy} onClick={() => act("reinstate")}>
              Reinstate
            </button>
          )}
          <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => act("note")}>
            Save note
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-4 border-t border-line pt-4">
          {c.kind === "college" && (
            <label className={lbl}>
              Free seats
              <span className="flex gap-2">
                <input className="field w-24" inputMode="numeric" value={seats} onChange={(e) => setSeats(e.target.value)} />
                <button type="button" className={small} disabled={busy} onClick={() => act("seats", Number(seats))}>
                  Set
                </button>
              </span>
            </label>
          )}
          {["approved", "suspended"].includes(c.status) && (
            <label className={lbl}>
              Extend by months
              <span className="flex gap-2">
                <input className="field w-24" inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} />
                <button type="button" className={small} disabled={busy} onClick={() => act("extend", Number(months))}>
                  Extend
                </button>
              </span>
            </label>
          )}
        </div>
        {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
      </div>

      <div className="plate grid gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-lg font-semibold">Students</p>
          <div className="flex flex-wrap gap-2">
            <select className="field !min-h-10 w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All ({rows.length})</option>
              {Object.entries(counts).map(([k, n]) => (
                <option key={k} value={k}>
                  {ROW[k]?.[0] ?? k} ({n})
                </option>
              ))}
              <option value="notsent">Login email not sent</option>
            </select>
            <button
              type="button"
              className={small}
              onClick={() =>
                downloadCsv(`chapter-${c.code ?? c.id.slice(0, 8)}`, [
                  ["Name", "Email", "Mobile", "Gender", "Date of birth", "Course", "Year or class", "Branch", "Roll", "Parent or guardian", "Parent mobile", "Seat", "Status", "Member number"],
                  ...rows.map((r) => [r.full_name, r.email, r.phone, r.gender, r.dob, r.course === "Other" ? r.course_other : r.course, r.study_year, r.branch === "Other" ? r.branch_other : r.branch, r.roll_no, r.guardian_name, r.guardian_phone, r.seat, ROW[r.status]?.[0] ?? r.status, r.membership?.member_no]),
                ])
              }
            >
              CSV
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-go !min-h-10" disabled={busy || c.status !== "approved"} onClick={() => rowAct("approve")}>
            Approve ticked
          </button>
          <button type="button" className="btn btn-quiet !min-h-10" disabled={busy} onClick={() => rowAct("reject")}>
            Do not approve (reason above)
          </button>
          <button type="button" className="btn btn-quiet !min-h-10" disabled={busy} onClick={() => rowAct("retry")}>
            Try failed again
          </button>
          {c.status !== "approved" && <span className="self-center text-sm text-ink2">Students are approved together with the chapter.</span>}
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-mist text-left">
              <tr>
                <th className="p-2.5">
                  <input type="checkbox" className="h-4 w-4" checked={shown.length > 0 && shown.every((r) => picked.includes(r.id))} onChange={(e) => setPicked(e.target.checked ? shown.map((r) => r.id) : [])} aria-label="Tick all" />
                </th>
                <th className="p-2.5">Student</th>
                <th className="p-2.5">Details</th>
                <th className="p-2.5">Parent or guardian</th>
                <th className="p-2.5">Seat</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Member number</th>
                <th className="p-2.5" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-line align-top">
                  <td className="p-2.5">
                    <input type="checkbox" className="h-4 w-4" checked={picked.includes(r.id)} onChange={(e) => setPicked((x) => (e.target.checked ? [...x, r.id] : x.filter((y) => y !== r.id)))} aria-label={`Tick ${r.full_name}`} />
                  </td>
                  <td className="p-2.5">
                    <span className="block font-medium">{r.full_name}</span>
                    <span className="text-ink2">{r.email}</span>
                    {r.phone && <span className="block text-ink2">{r.phone}</span>}
                  </td>
                  <td className="p-2.5 text-ink2">
                    {r.gender}, born {r.dob ? shortDate(r.dob) : "—"}
                    <br />
                    {[r.course === "Other" ? r.course_other : r.course, r.study_year, r.branch === "Other" ? r.branch_other : r.branch].filter(Boolean).join(", ")}
                    {r.roll_no ? `, roll ${r.roll_no}` : ""}
                  </td>
                  <td className="p-2.5 text-ink2">{r.guardian_name ? `${r.guardian_name}, ${r.guardian_phone ?? ""}` : "—"}</td>
                  <td className="p-2.5">{r.seat === "free" ? "Free" : r.seat === "paid" ? "Paid by chapter" : "Pays self"}</td>
                  <td className="p-2.5">
                    <Badge tone={ROW[r.status]?.[1]}>{ROW[r.status]?.[0] ?? r.status}</Badge>
                    {r.status === "active" && <span className="mt-1 block text-xs text-ink2">{r.login_sent_at ? `Login sent ${shortDate(r.login_sent_at)}` : r.login_error ? `Not sent: ${r.login_error}` : "Sending…"}</span>}
                    {r.status === "active" && r.profile && <span className="block text-xs text-ink2">{r.profile.must_change_password ? "Not signed in yet" : "Signed in"}{r.profile.photo_updated_at ? ", photo added" : ""}</span>}
                    {(r.reason || (r.status === "failed" && r.login_error)) && <span className="mt-1 block text-xs text-[#8f1a11]">{r.reason ?? r.login_error}</span>}
                  </td>
                  <td className="readout p-2.5">{r.membership?.member_no ?? "—"}</td>
                  <td className="p-2.5">
                    {r.status === "active" && r.profile?.must_change_password && (
                      <button type="button" className={small} onClick={() => resend(r.id)}>
                        Resend login
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function Chapters() {
  const [list, setList] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, { all: number; waiting: number; active: number }>>({});
  const [tab, setTab] = useState("submitted");
  const [open, setOpen] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [addedMsg, setAddedMsg] = useState("");
  const load = useCallback(async () => {
    const { data } = await sb().from("chapters").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
    const { data: r } = await sb().from("chapter_members").select("chapter_id,status");
    const c: Record<string, { all: number; waiting: number; active: number }> = {};
    for (const x of r ?? []) {
      if (x.status === "removed") continue;
      c[x.chapter_id] ??= { all: 0, waiting: 0, active: 0 };
      c[x.chapter_id].all++;
      if (x.status === "pending") c[x.chapter_id].waiting++;
      if (x.status === "active") c[x.chapter_id].active++;
    }
    setCounts(c);
  }, []);
  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);
  if (open) {
    const fresh = list.find((x) => x.id === open.id) ?? open;
    return <Chapter key={fresh.id + fresh.status + fresh.free_seats + fresh.valid_until + (fresh.removed_at ?? "") + fresh.head_user} c={fresh} onBack={() => setOpen(null)} onChanged={load} />;
  }
  if (adding) return <ChapterAdd onCancel={() => setAdding(false)} onDone={(t) => { setAdding(false); setAddedMsg(t); setTab("draft"); load(); }} />;
  const tabs: [string, string][] = [
    ["submitted", "Waiting for approval"],
    ["students", "Approved, students waiting"],
    ["approved", "Approved"],
    ["draft", "Being prepared"],
    ["rejected", "Sent back"],
    ["suspended", "Suspended"],
    ["removed", "Removed"],
  ];
  const shown = list.filter((c) => {
    const inTab = tab === "removed" ? !!c.removed_at : c.removed_at ? false : tab === "students" ? c.status === "approved" && (counts[c.id]?.waiting ?? 0) > 0 : c.status === tab;
    return inTab && (!q || `${c.institution} ${c.code ?? ""} ${c.city ?? ""} ${c.head_name ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  });
  return (
    <div className="grid gap-5">
      <p className="text-ink2">
        College chapters are branch-wise, with a faculty coordinator, at least 10 students and a principal&apos;s letter; the first 15 students are free. School chapters are free for every student, and only the school can add students. Approving a chapter approves the students on its list and sends their logins.
      </p>
      <div className="flex flex-wrap gap-2">
        {tabs.map(([id, t]) => {
          const n = id === "removed" ? list.filter((c) => c.removed_at).length : id === "students" ? list.filter((c) => !c.removed_at && c.status === "approved" && (counts[c.id]?.waiting ?? 0) > 0).length : list.filter((c) => !c.removed_at && c.status === id).length;
          return (
            <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === id ? "bg-ink text-white" : "bg-mist text-ink2 hover:text-ink"}`}>
              {t} ({n})
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input className="field max-w-sm" placeholder="Search institution, number, city or coordinator" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="btn-go ml-auto" onClick={() => setAdding(true)}>
          Open a chapter
        </button>
      </div>
      {addedMsg && <Msg tone="good">{addedMsg}</Msg>}
      {shown.length === 0 && <p className="text-ink2">Nothing here.</p>}
      <ul className="grid gap-3">
        {shown.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => setOpen(c)} className="plate grid w-full gap-1 p-4 text-left transition-colors hover:border-ink sm:grid-cols-[1fr_auto] sm:items-center">
              <span>
                <span className="block font-semibold">{label(c)}</span>
                <span className="text-sm text-ink2">
                  {c.kind === "school" ? "School" : "College"}, {c.city}. Coordinator {c.head_name}. {counts[c.id]?.all ?? 0} students, {counts[c.id]?.active ?? 0} members
                  {counts[c.id]?.waiting ? `, ${counts[c.id].waiting} waiting` : ""}.
                </span>
              </span>
              <span className="flex items-center gap-2">
                {c.code && <span className="readout text-sm">{c.code}</span>}
                <Badge tone={STATUS[c.status]?.[1]}>{STATUS[c.status]?.[0]}</Badge>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
