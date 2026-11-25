"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ExpertFields } from "@/app/studio/StudioApp";
import { browserClient } from "@/lib/browser";
import { shortDate } from "@/lib/money";

/* Host a session, from any member login: a request to become a GRAAS host (webinars, lectures, workshops,
   live sessions). GRAAS approves the host first, then each session. Approved hosts run their sessions from
   the Expert studio with the same login. School students take part through their school chapter instead. */

const sb = () => browserClient();
const STATUS: Record<string, { text: string; cls: string }> = {
  approved: { text: "Approved host", cls: "bg-go-soft text-go-deep" },
  pending: { text: "Request with GRAAS", cls: "bg-[#fff6e5] text-[#7a4b00]" },
  paused: { text: "Hosting paused", cls: "bg-[#fff1ef] text-[#8f1a11]" },
  rejected: { text: "Not approved yet", cls: "bg-[#fff1ef] text-[#8f1a11]" },
};
const EV: Record<string, string> = { draft: "Draft", pending: "With GRAAS for approval", awaiting_fee: "Listing fee due", approved: "Published", rejected: "Not approved", paused: "Paused", cancelled: "Cancelled", completed: "Completed" };

const WAYS = [
  { t: "Webinars and live sessions", d: "Teach online to members across India. GRAAS publishes the session and handles registrations." },
  { t: "Lectures and workshops", d: "Hands-on or classroom sessions at a college, a chapter or your plant." },
  { t: "Free or paid", d: "Free sessions are simple. For paid ones GRAAS chooses ticket share or a fixed listing fee with you when approving." },
  { t: "Certificates for attendees", d: "Mark attendance and every attendee gets a GRAAS participation certificate." },
];

export default function HostSession({ a, school }: { a: any; school?: boolean }) {
  const [d, setD] = useState<any>(null);
  const [edit, setEdit] = useState(false);
  const p = a.profile;
  const load = useCallback(async () => {
    const { data } = await sb().rpc("my_expert");
    setD(data ?? {});
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  if (school)
    return (
      <div className="card p-6 sm:p-8">
        <h2 className="h-card !text-2xl">Host a session</h2>
        <p className="mt-2 text-ink2">School students take part through their school chapter. Ask your chapter coordinator to propose a competition, workshop or talk; GRAAS approves it and it appears on the Events page.</p>
      </div>
    );
  if (!d) return <div className="card p-8 text-ink2">Loading…</div>;
  const x = d.expert;
  const st = x ? (STATUS[x.status] ?? STATUS.pending) : null;
  const events: any[] = d.events ?? [];
  const showForm = !x || x.status === "rejected" || edit;
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid content-start gap-5">
        <div className="relative overflow-hidden rounded-[24px] bg-ink p-6 text-white shadow-[var(--shadow-card)] sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-go/25 blur-2xl" aria-hidden="true" />
          <p className="relative text-sm font-semibold text-[#7fe0a0]">Share what you know</p>
          <h2 className="relative mt-1 text-[clamp(1.6rem,1.2rem+1.4vw,2.3rem)] font-semibold leading-tight tracking-tight">Host a session for GRAAS members</h2>
          <p className="relative mt-2 max-w-2xl text-white/80">Students, professionals, colleges and companies can all host. Tell GRAAS what you would like to teach; once approved, you propose sessions and GRAAS publishes them.</p>
          {st && <span className={`relative mt-4 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${st.cls}`}>{st.text}</span>}
        </div>

        {x?.status === "pending" && !edit && (
          <div className="card grid gap-3 p-6">
            <p className="font-semibold">Your request is with GRAAS.</p>
            <p className="text-ink2">Sent on {shortDate(x.created_at)}. You will get an email when it is approved, usually within a few working days.</p>
            <button type="button" className="btn btn-ghost !min-h-10 justify-self-start" onClick={() => setEdit(true)}>
              Change my request
            </button>
          </div>
        )}
        {x?.status === "paused" && (
          <div className="card grid gap-2 p-6">
            <p className="font-semibold">GRAAS has paused hosting for now.</p>
            {x.staff_note && <p className="text-ink2">GRAAS: {x.staff_note}</p>}
            <p className="text-sm text-ink2">Write to connect@graas.org.in or use Help in your account to talk about it.</p>
          </div>
        )}
        {x?.status === "approved" && (
          <div className="card grid gap-4 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="h-card">Your sessions</h3>
                <p className="text-sm text-ink2">Create sessions, see registrations and mark attendance in the Expert studio. It uses this same login.</p>
              </div>
              <Link href="/studio" className="btn btn-primary">
                Open the Expert studio
              </Link>
            </div>
            {events.length === 0 ? (
              <p className="rounded-xl bg-mist px-4 py-6 text-center text-ink2">No sessions yet. Propose your first one in the Expert studio.</p>
            ) : (
              <ul className="grid gap-2">
                {events.map((e) => (
                  <li key={e.id ?? e.ref} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
                    <span>
                      <span className="block font-semibold">{e.title}</span>
                      <span className="text-sm text-ink2">{[shortDate(e.starts_at), e.registered ? `${e.registered} registered` : null].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-semibold">{EV[e.status] ?? e.status}</span>
                  </li>
                ))}
              </ul>
            )}
            {!edit && (
              <button type="button" className="text-sm font-semibold underline decoration-go decoration-2 underline-offset-4 justify-self-start" onClick={() => setEdit(true)}>
                Edit my host profile
              </button>
            )}
          </div>
        )}
        {showForm && <Form p={p} x={x} onDone={() => (setEdit(false), load())} onCancel={x ? () => setEdit(false) : undefined} />}
      </div>

      <aside className="grid content-start gap-4 xl:sticky xl:top-24 xl:self-start">
        <div className="card grid gap-4 p-5">
          <p className="font-semibold">What you can host</p>
          <ul className="grid gap-3">
            {WAYS.map((w) => (
              <li key={w.t} className="grid grid-cols-[0.75rem_1fr] gap-3">
                <span className="mt-2 h-2.5 w-2.5 rounded-full bg-go" aria-hidden="true" />
                <span>
                  <b className="font-semibold">{w.t}</b>
                  <span className="block text-sm text-ink2">{w.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card grid gap-2 p-5 text-sm">
          <p className="font-semibold">How it works</p>
          <ol className="grid list-decimal gap-1.5 pl-5 text-ink2">
            <li>Send the request below.</li>
            <li>GRAAS reviews your experience and approves you as a host.</li>
            <li>Propose a session in the Expert studio. GRAAS checks it and publishes it on the Events page.</li>
          </ol>
        </div>
      </aside>
    </div>
  );
}

function Form({ p, x, onDone, onCancel }: { p: any; x: any; onDone: () => void; onCancel?: () => void }) {
  const [f, setF] = useState<any>({ full_name: x?.full_name ?? p.full_name ?? "", headline: x?.headline ?? "", bio: x?.bio ?? "", expertise: x?.expertise ?? [], organisation: x?.organisation ?? p.organisation ?? "", designation: x?.designation ?? p.designation ?? "", linkedin: x?.linkedin ?? "" });
  const [err, setErr] = useState<{ field?: string; error: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((y: any) => ({ ...y, [k]: v }));
  const bad = (k: string) => (err?.field === k ? { "aria-invalid": true as const } : {});
  async function save() {
    setBusy(true);
    setErr(null);
    const { data } = await sb().rpc("expert_apply", { p: { ...f, update: true } });
    setBusy(false);
    if (!data?.ok) return setErr({ field: data?.field, error: data?.error ?? "Could not send the request." });
    onDone();
  }
  return (
    <div className="card grid gap-5 p-6 sm:p-8">
      <div>
        <h3 className="h-card !text-2xl">{x?.status === "approved" ? "Your host profile" : x ? "Update your request" : "Request to host"}</h3>
        <p className="text-ink2">Members see this on your sessions. Your mobile and email are not shown.</p>
      </div>
      {x?.status === "rejected" && (
        <p className="rounded-xl bg-[#fff1ef] px-4 py-3 text-[#8f1a11]">
          <b>GRAAS:</b> {x.staff_note ?? "The request was not approved."} You can update it and send it again.
        </p>
      )}
      <label className="grid gap-1.5 font-medium">
        Full name
        <input className="field" maxLength={80} value={f.full_name} onChange={(e) => set("full_name", e.target.value)} {...bad("full_name")} />
      </label>
      <ExpertFields f={f} set={set} bad={bad} />
      {err && <p className="rounded-xl bg-[#fff1ef] px-4 py-3 font-medium text-[#8f1a11]">{err.error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
          {busy ? "Sending…" : x?.status === "approved" ? "Save profile" : "Send request to GRAAS"}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
