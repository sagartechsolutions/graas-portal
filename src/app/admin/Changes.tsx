"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { inr, shortDate } from "@/lib/money";
import { Badge, Msg, lbl, sb } from "./shared";

const TABS = [
  ["pending", "Waiting for a decision"],
  ["awaiting_payment", "Waiting for payment"],
  ["done", "Completed"],
  ["closed", "Declined or cancelled"],
] as const;

const DETAIL_LABEL: Record<string, string> = { organisation: "Organisation", designation: "Designation", gender: "Gender", course: "Course", branch: "Branch", study_year: "Year of study" };

function Request({ r, canDecide, onDone }: { r: any; canDecide: boolean; onDone: () => void }) {
  const [fee, setFee] = useState(r.suggested_paise === null || r.suggested_paise === undefined ? "" : String(r.suggested_paise / 100));
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const details = Object.entries(r.details ?? {}).filter(([, v]) => v);

  async function decide(approve: boolean) {
    setMsg(null);
    const charge = Number(fee || 0);
    if (approve && (!Number.isFinite(charge) || charge < 0)) return setMsg({ tone: "bad", text: "Enter the fee difference in rupees, or 0 for no charge." });
    setBusy(true);
    const { data, error } = await sb().rpc("staff_decide_change", { p_id: r.id, p_approve: approve, p_charge_inr: approve ? charge : 0, p_note: note.trim() || null });
    setBusy(false);
    if (error || !data?.ok) return setMsg({ tone: "bad", text: data?.error ?? error?.message ?? "That did not work." });
    onDone();
  }

  return (
    <div className="plate grid gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{r.profile?.full_name ?? r.profile?.email}</p>
          <p className="text-sm text-ink2">
            <span className="readout">{r.membership?.member_no}</span>, {r.profile?.email}
            {r.profile?.phone ? `, ${r.profile.phone}` : ""}
          </p>
        </div>
        <p className="text-sm text-ink2">Asked on {shortDate(r.created_at)}</p>
      </div>
      <p className="flex flex-wrap items-center gap-2 text-[1.05rem] font-semibold">
        <Badge>{r.from_plan?.name}</Badge>
        <span aria-hidden="true">to</span>
        <Badge tone="good">{r.to_plan?.name}</Badge>
        <span className="text-sm font-normal text-ink2">valid until {r.membership?.ends_on ? shortDate(r.membership.ends_on) : "no end date"}</span>
      </p>
      {r.reason && <p className="rounded-xl bg-mist px-4 py-3 text-[0.95rem]">&ldquo;{r.reason}&rdquo;</p>}
      {details.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-[0.95rem] sm:grid-cols-3">
          {details.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-ink2">{DETAIL_LABEL[k] ?? k}</dt>
              <dd className="font-medium">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
      {r.status === "pending" && canDecide && (
        <div className="grid gap-3 border-t border-line pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className={`${lbl} w-52`}>
              Fee difference, ₹
              <input className="field !min-h-10 readout" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="0" />
            </label>
            <p className="max-w-md pb-2 text-sm text-ink2">
              {r.suggested_paise === null ? "No suggestion: a fee is not set for one of the plans." : `Suggested ${inr(r.suggested_paise)}: the yearly fee difference for the days left, less the length discount the member paid with.`} Enter 0 to change the type at once with no charge.
            </p>
          </div>
          <label className={lbl}>
            Note to the member <span className="font-normal text-ink2">(needed when declining)</span>
            <textarea className="field min-h-16" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-go !min-h-10 !py-2" onClick={() => decide(true)} disabled={busy}>
              {Number(fee || 0) > 0 ? `Approve, member pays ${inr(Math.round(Number(fee) * 100))}` : "Approve and change now"}
            </button>
            <button type="button" className="btn btn-quiet !min-h-10 !py-2" onClick={() => decide(false)} disabled={busy}>
              Decline
            </button>
          </div>
        </div>
      )}
      {r.status === "awaiting_payment" && <p className="text-sm">Approved {shortDate(r.decided_at)}. The member pays {inr(r.charge_paise)} from their account; the type changes when the payment arrives.</p>}
      {r.status === "done" && <p className="text-sm">Changed {shortDate(r.completed_at)}{r.charge_paise > 0 ? ` after a payment of ${inr(r.charge_paise)}` : ", no charge"}.</p>}
      {(r.status === "declined" || r.status === "cancelled") && <p className="text-sm">{r.status === "declined" ? `Declined ${shortDate(r.decided_at)}: ${r.staff_note ?? ""}` : "Cancelled by the member."}</p>}
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
    </div>
  );
}

/** Members' requests to change membership type after payment. */
export function Changes({ role }: { role: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [tab, setTab] = useState<string>("pending");
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb()
      .from("plan_change_requests")
      .select("*, profile:profiles(full_name,email,phone), from_plan:membership_plans!from_plan_id(name), to_plan:membership_plans!to_plan_id(name,audience), membership:memberships(member_no,ends_on,status)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) setErr(error.message);
    setRows(data ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const inTab = (r: any, t: string) => (t === "closed" ? r.status === "declined" || r.status === "cancelled" : r.status === t);
  const shown = rows.filter((r) => inTab(r, tab));
  const canDecide = role === "super_admin" || role === "membership_desk";
  return (
    <div>
      <p className="max-w-2xl text-ink2">
        Members ask here to change their membership type after paying, for example from Student to Professional. Approving with a fee difference asks the member to pay it; with 0 the type changes at once. The member number and end date stay the same.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${tab === id ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"}`}>
            {label} <span className="readout opacity-70">{rows.filter((r) => inTab(r, id)).length}</span>
          </button>
        ))}
      </div>
      {err && <p role="alert" className="mt-3 font-semibold text-[#8f1a11]">{err}</p>}
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {shown.map((r) => (
          <Request key={r.id} r={r} canDecide={canDecide} onDone={load} />
        ))}
      </div>
      {shown.length === 0 && <p className="mt-6 text-ink2">Nothing here.</p>}
    </div>
  );
}
