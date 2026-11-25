"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ParticipationCertificate } from "@/components/member/MemberDocs";
import { Modal } from "@/components/opps/MemberOpps";
import { browserClient } from "@/lib/browser";
import { inr } from "@/lib/money";
import { payOnline } from "@/lib/pay";
import { EVENT_KINDS, EventBody, EventCard, REG_STATUS } from "./EvBits";

/* Events in the account: what is coming up (with the member price), registration and payment, the joining link,
   and participation certificates afterwards. Also used by signed-in visitors who are not members (public price). */

export default function MemberEvents({ a }: { a: any }) {
  const [d, setD] = useState<any>(null);
  const [view, setView] = useState<"upcoming" | "mine">("upcoming");
  const [kind, setKind] = useState("");
  const [open, setOpen] = useState<any>(null);
  const [cert, setCert] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const load = useCallback(async () => {
    const { data } = await browserClient().rpc("member_events");
    setD(data ?? { upcoming: [], mine: [] });
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("event");
    if (ref && d?.upcoming) {
      const e = d.upcoming.find((x: any) => x.ref.toLowerCase() === ref.toLowerCase());
      if (e) Promise.resolve().then(() => setOpen(e));
    }
  }, [d]);

  async function register(e: any) {
    setBusy(true);
    setFlash("");
    const { data } = await browserClient().rpc("member_event_register", { p_event: e.id });
    if (data?.ok && data.need_payment) {
      const r = await payOnline({ purpose: "event", event_id: e.id }, setFlash);
      setBusy(false);
      if (r.ok) {
        setOpen(null);
        setFlash(`Payment received. You are registered for ${e.title}. A confirmation email is on its way.`);
        setView("mine");
      } else if (r.error) setFlash(r.error);
      return load();
    }
    setBusy(false);
    if (!data?.ok) return setFlash(data?.error ?? "Could not register.");
    setOpen(null);
    setFlash(`You are registered for ${e.title}. A confirmation email is on its way.`);
    setView("mine");
    load();
  }
  async function cancel(regId: string) {
    const { data } = await browserClient().rpc("member_event_cancel", { p_reg: regId });
    setFlash(data?.ok ? "Registration cancelled." : data?.error ?? "Could not cancel.");
    load();
  }

  if (!d) return <div className="card p-8 text-ink2">Loading events…</div>;
  if (cert)
    return (
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button type="button" className="link" onClick={() => setCert(null)}>
            Back to my events
          </button>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            Print or save as PDF
          </button>
        </div>
        <ParticipationCertificate name={a.profile.full_name} memberNo={a.membership?.status === "active" ? a.membership?.member_no : null} e={cert} regId={cert.registration.id} photo={a.profile.photo_updated_at ? { id: a.profile.id, stamp: a.profile.photo_updated_at } : undefined} />
      </div>
    );
  const up = (d.upcoming as any[]).filter((e) => !kind || e.kind === kind);
  const mine = d.mine as any[];
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="h-card !text-2xl">Events and live sessions</h2>
          <p className="text-ink2">{d.member ? "Webinars, industry-leader lectures, workshops and competitions. Members join free or at the member price." : "Join GRAAS to get member prices: many sessions are free for members."}</p>
        </div>
        <div className="inline-flex rounded-full bg-white p-1 shadow-[var(--shadow-card)]">
          {(
            [
              ["upcoming", `Upcoming (${d.upcoming.length})`],
              ["mine", `My events (${mine.length})`],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setView(k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === k ? "bg-ink text-white" : "text-ink2"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {flash && <p className="rounded-xl bg-go-soft px-4 py-3 font-medium text-go-deep">{flash}</p>}
      {view === "upcoming" ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setKind("")} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${!kind ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
              All
            </button>
            {EVENT_KINDS.filter((k) => d.upcoming.some((e: any) => e.kind === k.id)).map((k) => (
              <button key={k.id} type="button" onClick={() => setKind(k.id)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${kind === k.id ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
                {k.label}
              </button>
            ))}
          </div>
          {up.length === 0 ? (
            <div className="card p-8 text-center text-ink2">No upcoming events right now. GRAAS emails members when new sessions open.</div>
          ) : (
            <ul className="grid gap-3 xl:grid-cols-2">
              {up.map((e) => (
                <li key={e.id}>
                  <EventCard
                    e={e}
                    onOpen={() => setOpen(e)}
                    badge={
                      e.my_status && e.my_status !== "cancelled" ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${REG_STATUS[e.my_status]?.tone}`}>{REG_STATUS[e.my_status]?.label}</span>
                      ) : !e.open ? (
                        <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-semibold">Registration closed</span>
                      ) : null
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : mine.length === 0 ? (
        <div className="card p-8 text-center text-ink2">You have not registered for any event yet.</div>
      ) : (
        <ul className="grid gap-3">
          {mine.map((e) => (
            <li key={e.id} className="grid gap-2">
              <EventCard e={e} badge={<span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${REG_STATUS[e.registration.status]?.tone}`}>{REG_STATUS[e.registration.status]?.label}</span>} />
              <div className="flex flex-wrap items-center gap-2 px-1">
                {e.join_link && !e.past && (
                  <a href={e.join_link} target="_blank" rel="noreferrer" className="btn btn-primary !min-h-10">
                    Join the session
                  </a>
                )}
                {e.certificate_ready && (
                  <button type="button" className="btn btn-primary !min-h-10" onClick={() => setCert(e)}>
                    Participation certificate
                  </button>
                )}
                {e.registration.status === "registered" && !e.past && e.registration.amount_paise === 0 && (
                  <button type="button" className="btn btn-ghost !min-h-10" onClick={() => confirm("Cancel your registration?") && cancel(e.registration.id)}>
                    Cancel registration
                  </button>
                )}
                {e.registration.amount_paise > 0 && <span className="text-sm text-ink2">Paid {inr(e.registration.amount_paise)}. Receipt under Payments.</span>}
                {e.past && e.registration.status === "registered" && <span className="text-sm text-ink2">Certificate appears once the host marks attendance.</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <Modal onClose={() => setOpen(null)}>
          <p className="text-sm font-semibold text-go-deep">
            {open.kind_label} · {open.ref}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">{open.title}</h2>
          <div className="mt-5 grid gap-6">
            {open.my_status && !["cancelled"].includes(open.my_status) ? (
              <p className="rounded-xl bg-go-soft px-4 py-3 font-semibold text-go-deep">You are registered. The joining link is under My events.</p>
            ) : open.open ? (
              <div className="grid gap-3 rounded-2xl border-2 border-ink p-5">
                <p className="text-lg font-semibold">{open.my_price_paise > 0 ? `Your fee: ${inr(open.my_price_paise)}` : "Free for you"}</p>
                {!d.member && open.price_member_paise < open.price_public_paise && (
                  <p className="text-sm text-ink2">
                    Members pay {open.price_member_paise ? inr(open.price_member_paise) : "nothing"}.{" "}
                    <Link href="/membership" className="font-semibold underline">
                      See membership
                    </Link>
                  </p>
                )}
                <button type="button" className="btn btn-primary justify-self-start" disabled={busy} onClick={() => register(open)}>
                  {busy ? "Please wait…" : open.my_price_paise > 0 ? `Pay ${inr(open.my_price_paise)} and register` : "Register"}
                </button>
              </div>
            ) : (
              <p className="rounded-xl bg-mist px-4 py-3 font-semibold">Registration is closed.</p>
            )}
            <EventBody e={open} />
          </div>
        </Modal>
      )}
    </div>
  );
}
