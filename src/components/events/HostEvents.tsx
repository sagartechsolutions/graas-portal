"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { phoneText } from "@/lib/format";
import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/opps/MemberOpps";
import { browserClient } from "@/lib/browser";
import { inr } from "@/lib/money";
import { payOnline } from "@/lib/pay";
import { EV_STATUS, EventCard, REG_STATUS, fmtWhen } from "./EvBits";
import EventForm from "./EventForm";

/** Who registered, with attendance marking once the event has started. Staff also see email and phone. */
export function Registrations({ e, onClose, staff = false }: { e: any; onClose: () => void; staff?: boolean }) {
  const [list, setList] = useState<any[] | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const { data } = await browserClient().rpc("host_registrations", { p_event: e.id });
    setList((data as any[]) ?? []);
  }, [e.id]);
  useEffect(() => {
    load();
  }, [load]);
  const started = new Date(e.starts_at).getTime() <= Date.now();
  async function mark(attended: boolean) {
    const { data } = await browserClient().rpc("host_attendance", { p_event: e.id, p_ids: sel, p_attended: attended });
    setMsg(data?.ok ? `${data.updated} marked ${attended ? "present" : "absent"}.${attended && e.certificate ? " Their certificates are ready after the event ends." : ""}` : data?.error ?? "Could not save.");
    setSel([]);
    load();
  }
  function csv() {
    const rows = [["Name", "Member number", "Organisation", "City", "Status", ...(staff ? ["Email", "Phone"] : [])], ...(list ?? []).map((r) => [r.name, r.member_no ?? "", r.organisation ?? "", r.city ?? "", r.status, ...(staff ? [r.email, r.phone] : [])])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + rows.map((r) => r.map((c: any) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n")], { type: "text/csv" }));
    a.download = `${e.ref}-registrations.csv`;
    a.click();
  }
  const live = (list ?? []).filter((r) => r.status !== "cancelled");
  return (
    <Modal onClose={onClose} wide>
      <p className="text-sm font-semibold text-go-deep">
        {e.kind_label} · {e.ref}
      </p>
      <h2 className="text-2xl font-semibold tracking-tight">{e.title}</h2>
      <p className="text-ink2">{fmtWhen(e)}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{live.length} registered</span>
        <span className="rounded-full bg-go-soft px-3 py-1 text-sm font-semibold text-go-deep">{live.filter((r) => r.status === "attended").length} attended</span>
        <button type="button" className="btn btn-ghost ml-auto !min-h-10" onClick={csv} disabled={!list?.length}>
          Download list
        </button>
      </div>
      {msg && <p className="mt-4 rounded-xl bg-go-soft px-4 py-3 font-medium text-go-deep">{msg}</p>}
      {!started && <p className="mt-4 rounded-xl bg-mist px-4 py-3 text-sm text-ink2">Attendance can be marked once the event starts. Attendees then receive their participation certificate.</p>}
      {!list ? (
        <p className="mt-6 text-ink2">Loading…</p>
      ) : list.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-mist p-6 text-ink2">Nobody has registered yet.</p>
      ) : (
        <>
          {started && (
            <div className="sticky top-16 z-10 mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-[var(--shadow-card)]">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" className="h-4 w-4 accent-[#067a2e]" checked={sel.length === live.length && live.length > 0} onChange={(x) => setSel(x.target.checked ? live.map((r) => r.id) : [])} />
                Select all
              </label>
              <button type="button" className="btn btn-primary !min-h-10" disabled={!sel.length} onClick={() => mark(true)}>
                Mark present ({sel.length})
              </button>
              <button type="button" className="btn btn-ghost !min-h-10" disabled={!sel.length} onClick={() => mark(false)}>
                Mark absent
              </button>
            </div>
          )}
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
            {list.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                {started && r.status !== "cancelled" && (
                  <input type="checkbox" className="h-4 w-4 accent-[#067a2e]" checked={sel.includes(r.id)} onChange={(x) => setSel(x.target.checked ? [...sel, r.id] : sel.filter((y) => y !== r.id))} aria-label={`Select ${r.name}`} />
                )}
                <span className="min-w-0 flex-1">
                  <b className="font-semibold">{r.name}</b>
                  <span className="block text-sm text-ink2">{[r.member_no ?? "Not a member", r.organisation, r.city, staff ? r.email : null, staff && r.phone ? phoneText(r.phone) : null].filter(Boolean).join(" · ")}</span>
                </span>
                {r.amount_paise > 0 && <span className="readout text-sm">{inr(r.amount_paise)}</span>}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${REG_STATUS[r.status]?.tone}`}>{REG_STATUS[r.status]?.label}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}

/** The host's list of events (chapter console and Expert studio). */
export default function HostEvents({ mode, events, reload }: { mode: "chapter" | "expert"; events: any[]; reload: () => void }) {
  const [form, setForm] = useState<any>(null);
  const [regs, setRegs] = useState<any>(null);
  const [flash, setFlash] = useState("");
  async function act(e: any, action: string) {
    const { data } = await browserClient().rpc("host_event_action", { p_id: e.id, p_action: action });
    setFlash(data?.ok ? (action === "submit" ? "Sent to GRAAS for approval." : "Moved back to drafts.") : data?.error ?? "Could not do that.");
    reload();
  }
  async function payFee(e: any) {
    setFlash("");
    const r = await payOnline({ purpose: "listing", event_id: e.id }, setFlash);
    if (r.ok) setFlash("Listing fee received. Your session is now published.");
    else if (r.error) setFlash(r.error);
    reload();
  }
  if (form) return <EventForm mode={mode} initial={form === "new" ? undefined : form} onCancel={() => setForm(null)} onDone={(m) => { setForm(null); setFlash(m); reload(); }} />;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="h-card !text-xl">{mode === "chapter" ? "Chapter events and competitions" : "Your sessions"}</h3>
          <p className="text-sm text-ink2">{mode === "chapter" ? "Announce competitions, workshops, lectures, meetups and visits. GRAAS approves each one before members can register." : "Create a session, send it to GRAAS, and track registrations and attendance here."}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setForm("new")}>
          {mode === "chapter" ? "Announce an event" : "Create a session"}
        </button>
      </div>
      {flash && <p className="rounded-xl bg-go-soft px-4 py-3 font-medium text-go-deep">{flash}</p>}
      {events.length === 0 ? (
        <div className="card p-8 text-center text-ink2">Nothing yet.</div>
      ) : (
        <ul className="grid gap-3">
          {events.map((e) => (
            <li key={e.id} className="grid gap-2">
              <EventCard e={e} badge={<span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${EV_STATUS[e.status]?.tone}`}>{EV_STATUS[e.status]?.label}</span>} />
              {e.staff_note && ["rejected", "cancelled"].includes(e.status) && <p className="rounded-xl bg-[#fff1ef] px-4 py-3 text-sm text-[#8f1a11]"><b>GRAAS:</b> {e.staff_note}</p>}
              {e.status === "awaiting_fee" && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#fff6e5] px-4 py-3 text-sm text-[#7a4b00]">
                  Approved under the listing-fee model. Pay {inr(e.money?.listing_fee_paise)} to publish; attendees then join free.
                  <button type="button" className="btn btn-primary !min-h-9 !py-1.5" onClick={() => payFee(e)}>
                    Pay and publish
                  </button>
                </div>
              )}
              {mode === "expert" && e.money?.model === "ticket_share" && (
                <p className="px-1 text-sm text-ink2">
                  Ticket sales so far {inr(e.gross_paise)}. GRAAS keeps {Number(e.money.fee_pct)}%; your share {inr(Math.round(Number(e.gross_paise) * (1 - Number(e.money.fee_pct) / 100)))}
                  {e.payout ? `, paid on ${e.payout.paid_on} (ref. ${e.payout.reference}).` : ", paid to you after the session."}
                </p>
              )}
              <div className="flex flex-wrap gap-2 px-1 text-sm">
                <span className="text-ink2">{e.registered ?? 0} registered</span>
                <span className="ml-auto flex flex-wrap gap-2">
                  {["approved", "completed", "paused"].includes(e.status) && (
                    <button type="button" className="btn btn-ghost !min-h-9 !py-1.5" onClick={() => setRegs(e)}>
                      Registrations and attendance
                    </button>
                  )}
                  {!["cancelled", "completed", "removed"].includes(e.status) && (
                    <button type="button" className="btn btn-ghost !min-h-9 !py-1.5" onClick={() => setForm(e)}>
                      Edit
                    </button>
                  )}
                  {["draft", "rejected"].includes(e.status) && (
                    <button type="button" className="btn btn-ghost !min-h-9 !py-1.5" onClick={() => act(e, "submit")}>
                      Send to GRAAS
                    </button>
                  )}
                  {e.status === "pending" && (
                    <button type="button" className="btn btn-ghost !min-h-9 !py-1.5" onClick={() => act(e, "withdraw")}>
                      Withdraw
                    </button>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {regs && <Registrations e={regs} onClose={() => { setRegs(null); reload(); }} />}
    </div>
  );
}

