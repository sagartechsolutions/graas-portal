"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { phoneText } from "@/lib/format";
import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EV_STATUS, EventBody, fmtWhen, priceLine } from "@/components/events/EvBits";
import EventForm from "@/components/events/EventForm";
import { Registrations } from "@/components/events/HostEvents";
import { inr } from "@/lib/money";
import { Badge, Msg, refreshSite, sb, small, type Tone } from "./shared";

const TONE: Record<string, Tone> = { pending: "warn", awaiting_fee: "warn", approved: "good", rejected: "bad", paused: "plain", cancelled: "bad", completed: "plain", removed: "bad", draft: "plain" };
const HOST: Record<string, string> = { graas: "GRAAS", chapter: "Chapter", expert: "Expert" };

/** Events, experts and expert payouts. */
export function Events({ session, role }: { session: Session; role: string }) {
  const [d, setD] = useState<any>(null);
  const [view, setView] = useState<"events" | "experts" | "payouts">("events");
  const [filter, setFilter] = useState("pending");
  const [open, setOpen] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [regs, setRegs] = useState<any>(null);
  const [note, setNote] = useState("");
  const [model, setModel] = useState<{ m: string; pct: string; fee: string }>({ m: "ticket_share", pct: "20", fee: "1000" });
  const [msg, setMsg] = useState<{ tone: Tone; text: string } | null>(null);
  const isEvents = role === "super_admin" || role === "event_manager";
  const isFinance = role === "super_admin" || role === "finance";
  const load = useCallback(async () => {
    const { data } = await sb().rpc("staff_events");
    setD(data ?? { events: [], experts: [] });
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const events: any[] = useMemo(() => d?.events ?? [], [d]);
  const shown = events.filter((e) => filter === "all" || e.status === filter);
  const paid = (e: any) => e.host_type === "expert" && (e.price_member_paise > 0 || e.price_public_paise > 0 || e.money?.model === "listing_fee");

  async function act(e: any, action: string) {
    const args: any = { p_id: e.id, p_action: action, p_note: note || null, p_model: null, p_fee_pct: null, p_listing_inr: null };
    if (action === "approve" && paid(e)) {
      args.p_model = model.m;
      if (model.m === "ticket_share") args.p_fee_pct = Number(model.pct);
      else args.p_listing_inr = Number(model.fee);
    }
    const { data } = await sb().rpc("staff_event_action", args);
    if (!data?.ok) return setMsg({ tone: "bad", text: data?.error ?? "Could not do that." });
    setMsg({ tone: "good", text: `${e.title}: ${EV_STATUS[data.status]?.label ?? data.status}.` });
    setOpen(null);
    setNote("");
    await refreshSite(session);
    load();
  }
  async function expert(x: any, action: string) {
    const { data } = await sb().rpc("staff_expert_action", { p_user: x.user_id, p_action: action, p_note: note || null });
    setMsg(data?.ok ? { tone: "good", text: `${x.full_name}: ${data.status}.` } : { tone: "bad", text: data?.error ?? "Could not do that." });
    setNote("");
    load();
  }
  async function payout(e: any, ref: string, on: string) {
    const { data } = await sb().rpc("staff_record_payout", { p_event: e.id, p_reference: ref, p_paid_on: on || null });
    setMsg(data?.ok ? { tone: "good", text: `Payout of ${inr(data.net_paise)} recorded for ${e.title}.` } : { tone: "bad", text: data?.error ?? "Could not record." });
    load();
  }

  if (form)
    return (
      <EventForm
        mode="staff"
        initial={form === "new" ? undefined : form}
        onCancel={() => setForm(null)}
        onDone={async (m) => {
          setForm(null);
          setMsg({ tone: "good", text: m });
          await refreshSite(session);
          load();
        }}
      />
    );
  const pendingExperts = (d?.experts ?? []).filter((x: any) => x.status === "pending").length;
  const share = events.filter((e) => e.host_type === "expert" && e.money?.model === "ticket_share" && ["approved", "completed", "paused"].includes(e.status));
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-white p-1 shadow-[var(--shadow-card)]">
          {(
            [
              ["events", `Events (${events.length})`],
              ["experts", `Experts${pendingExperts ? ` · ${pendingExperts} new` : ""}`],
              ["payouts", "Expert payouts"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setView(k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === k ? "bg-ink text-white" : "text-ink2"}`}>
              {l}
            </button>
          ))}
        </div>
        {isEvents && view === "events" && (
          <button type="button" className="btn-go" onClick={() => setForm("new")}>
            Create a GRAAS event
          </button>
        )}
      </div>
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
      {!d ? (
        <p className="text-ink2">Loading…</p>
      ) : view === "events" ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {["pending", "awaiting_fee", "approved", "paused", "rejected", "completed", "cancelled", "removed", "all"].map((k) => {
              const n = events.filter((e) => k === "all" || e.status === k).length;
              return (
                <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${filter === k ? "bg-ink text-white" : "bg-white text-ink2 shadow-[var(--shadow-card)]"}`}>
                  {k === "all" ? "All" : EV_STATUS[k]?.label} {n ? `(${n})` : ""}
                </button>
              );
            })}
          </div>
          {shown.length === 0 ? (
            <p className="plate p-6 text-ink2">Nothing here.</p>
          ) : (
            <div className="plate overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-line text-ink2">
                  <tr>
                    <th className="p-3">Event</th>
                    <th className="p-3">Host</th>
                    <th className="p-3">When</th>
                    <th className="p-3">Fee</th>
                    <th className="p-3">Registered</th>
                    <th className="p-3">Status</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((e) => (
                    <tr key={e.id} className="border-b border-line last:border-0">
                      <td className="p-3">
                        <p className="font-semibold">{e.title}</p>
                        <p className="text-ink2">
                          {e.kind_label} · {e.ref}
                        </p>
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{e.host?.name}</p>
                        <p className="text-ink2">{HOST[e.host_type]}</p>
                      </td>
                      <td className="p-3">{fmtWhen(e)}</td>
                      <td className="p-3">
                        {priceLine(e)}
                        {e.money?.model === "ticket_share" && <span className="block text-ink2">Ticket share {Number(e.money.fee_pct)}%</span>}
                        {e.money?.model === "listing_fee" && <span className="block text-ink2">Listing fee {inr(e.money.listing_fee_paise)}{e.money.listing_paid ? ", paid" : ""}</span>}
                      </td>
                      <td className="readout p-3">
                        {e.registered}
                        {e.attended ? ` / ${e.attended} came` : ""}
                      </td>
                      <td className="p-3">
                        <Badge tone={TONE[e.status]}>{EV_STATUS[e.status]?.label}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        <button type="button" className={small} onClick={() => { setOpen(e); setNote(""); }}>
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : view === "experts" ? (
        (d.experts ?? []).length === 0 ? (
          <p className="plate p-6 text-ink2">No expert applications yet. Experts apply at graas.org.in/studio.</p>
        ) : (
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm font-semibold">
              Note (needed to decline; sent to the applicant)
              <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            {(d.experts as any[]).map((x) => (
              <div key={x.user_id} className="plate grid gap-2 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">
                      {x.full_name} <Badge tone={x.status === "approved" ? "good" : x.status === "pending" ? "warn" : "plain"}>{x.status}</Badge>
                    </p>
                    <p className="text-ink2">{[x.headline, x.organisation, x.designation].filter(Boolean).join(" · ")}</p>
                    <p className="text-sm text-ink2">
                      {x.email} · {x.phone ? phoneText(x.phone) : "no phone"} · {x.sessions} sessions
                      {x.linkedin && (
                        <>
                          {" · "}
                          <a href={x.linkedin} target="_blank" rel="noreferrer" className="font-semibold underline">
                            LinkedIn
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  {isEvents && (
                    <div className="flex flex-wrap gap-2">
                      {x.status !== "approved" && (
                        <button type="button" className="btn-go" onClick={() => expert(x, "approve")}>
                          Approve
                        </button>
                      )}
                      {["pending", "approved", "paused"].includes(x.status) && (
                        <button type="button" className="btn-quiet" onClick={() => expert(x, "reject")}>
                          Decline
                        </button>
                      )}
                      {x.status === "approved" && (
                        <button type="button" className="btn-quiet" onClick={() => expert(x, "pause")}>
                          Pause
                        </button>
                      )}
                      {x.status === "paused" && (
                        <button type="button" className="btn-quiet" onClick={() => expert(x, "resume")}>
                          Resume
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {x.bio && <p className="whitespace-pre-line text-sm">{x.bio}</p>}
                {(x.expertise ?? []).length > 0 && <p className="text-sm text-ink2">Topics: {x.expertise.join(", ")}</p>}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="grid gap-3">
          <p className="max-w-3xl text-ink2">Ticket-share expert sessions. After a session, pay the expert their share by bank transfer or UPI, then record the reference here. The expert sees it in their studio.</p>
          {share.length === 0 ? (
            <p className="plate p-6 text-ink2">No ticket-share sessions yet.</p>
          ) : (
            share.map((e) => <PayoutRow key={e.id} e={e} canPay={isFinance} onPay={payout} />)
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-ink/40" onClick={() => setOpen(null)}>
          <div className="h-full w-full max-w-3xl overflow-y-auto bg-white p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-go-deep">
                  {open.kind_label} · {open.ref} · {HOST[open.host_type]}: {open.host?.name}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight">{open.title}</h2>
                {open.join_link && <p className="text-sm text-ink2">Joining link: {open.join_link}</p>}
              </div>
              <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-xl" onClick={() => setOpen(null)} aria-label="Close">
                ×
              </button>
            </div>
            {isEvents && (
              <div className="mt-5 grid gap-3 rounded-2xl bg-mist p-4">
                {paid(open) && !["approved", "cancelled", "completed", "removed"].includes(open.status) && (
                  <fieldset className="grid gap-2">
                    <legend className="text-sm font-semibold">Fee model for this paid expert session</legend>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="model" checked={model.m === "ticket_share"} onChange={() => setModel({ ...model, m: "ticket_share" })} />
                      Ticket share: GRAAS sells tickets and keeps
                      <input className="field !min-h-9 w-20 !py-1" type="number" min={0} max={100} value={model.pct} onChange={(e) => setModel({ ...model, pct: e.target.value })} />%
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="model" checked={model.m === "listing_fee"} onChange={() => setModel({ ...model, m: "listing_fee" })} />
                      Listing fee: the expert pays ₹
                      <input className="field !min-h-9 w-28 !py-1" type="number" min={1} value={model.fee} onChange={(e) => setModel({ ...model, fee: e.target.value })} />
                      and attendees join free
                    </label>
                  </fieldset>
                )}
                <label className="grid gap-1 text-sm font-semibold">
                  Note (needed to send back or cancel; sent to the host and, for a cancellation, to everyone registered)
                  <textarea className="field min-h-16" value={note} onChange={(e) => setNote(e.target.value)} />
                </label>
                <div className="flex flex-wrap gap-2">
                  {["pending", "rejected", "paused", "draft", "awaiting_fee"].includes(open.status) && (
                    <button type="button" className="btn-go" onClick={() => act(open, "approve")}>
                      Approve{open.status === "paused" ? "" : " and publish"}
                    </button>
                  )}
                  {["pending", "approved", "paused", "awaiting_fee"].includes(open.status) && (
                    <button type="button" className="btn-quiet" onClick={() => act(open, "reject")}>
                      Send back
                    </button>
                  )}
                  {open.status === "approved" && (
                    <button type="button" className="btn-quiet" onClick={() => act(open, "pause")}>
                      Pause registrations
                    </button>
                  )}
                  {open.status === "paused" && (
                    <button type="button" className="btn-quiet" onClick={() => act(open, "resume")}>
                      Resume
                    </button>
                  )}
                  {["approved", "paused"].includes(open.status) && (
                    <button type="button" className="btn-quiet" onClick={() => act(open, "complete")}>
                      Mark completed
                    </button>
                  )}
                  {["approved", "paused", "awaiting_fee", "pending"].includes(open.status) && (
                    <button type="button" className="btn-quiet !text-[#8f1a11]" onClick={() => confirm("Cancel this event? Everyone registered is told, and paid tickets are flagged for refund.") && act(open, "cancel")}>
                      Cancel event
                    </button>
                  )}
                  {open.status !== "removed" ? (
                    <button type="button" className="btn-quiet" onClick={() => confirm("Remove this event from every list?") && act(open, "remove")}>
                      Remove
                    </button>
                  ) : (
                    <button type="button" className="btn-quiet" onClick={() => act(open, "restore")}>
                      Restore for checking
                    </button>
                  )}
                  <button type="button" className="btn-quiet" onClick={() => { setForm(open); setOpen(null); }}>
                    Edit
                  </button>
                  <button type="button" className="btn-quiet" onClick={() => setRegs(open)}>
                    Registrations ({open.registered})
                  </button>
                </div>
                {open.staff_note && <p className="text-sm text-ink2">Last note: {open.staff_note}</p>}
              </div>
            )}
            <div className="mt-6">
              <EventBody e={open} />
            </div>
          </div>
        </div>
      )}
      {regs && <Registrations e={regs} staff onClose={() => { setRegs(null); load(); }} />}
    </div>
  );
}

function PayoutRow({ e, canPay, onPay }: { e: any; canPay: boolean; onPay: (e: any, ref: string, on: string) => void }) {
  const [ref, setRef] = useState("");
  const [on, setOn] = useState("");
  const gross = Number(e.gross_paise), fee = Math.round((gross * Number(e.money.fee_pct)) / 100);
  const ended = new Date(e.ends_at ?? e.starts_at).getTime() < Date.now();
  return (
    <div className="plate flex flex-wrap items-center gap-4 p-5">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{e.title}</p>
        <p className="text-sm text-ink2">
          {e.host?.name} · {fmtWhen(e)}
        </p>
        <p className="readout mt-1 text-sm">
          Tickets {inr(gross)} · GRAAS {Number(e.money.fee_pct)}% {inr(fee)} · Expert {inr(gross - fee)}
        </p>
      </div>
      {e.payout ? (
        <Badge tone="good">
          Paid {e.payout.paid_on}, ref. {e.payout.reference}
        </Badge>
      ) : !ended ? (
        <Badge>After the session</Badge>
      ) : canPay ? (
        <span className="flex flex-wrap items-center gap-2">
          <input className="field !min-h-10 w-44 !py-1.5 text-sm" placeholder="Bank or UPI reference" value={ref} onChange={(x) => setRef(x.target.value)} />
          <input className="field !min-h-10 w-40 !py-1.5 text-sm" type="date" value={on} onChange={(x) => setOn(x.target.value)} />
          <button type="button" className="btn-go" disabled={!ref.trim()} onClick={() => onPay(e, ref, on)}>
            Record payout
          </button>
        </span>
      ) : (
        <Badge tone="warn">Due</Badge>
      )}
    </div>
  );
}
