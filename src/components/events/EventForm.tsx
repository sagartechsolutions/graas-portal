"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Tags } from "@/components/member/CareerProfile";
import { browserClient } from "@/lib/browser";
import { EVENT_KINDS } from "./EvBits";

type Mode = "staff" | "expert" | "chapter";
const toLocal = (iso?: string | null) => (iso ? new Date(new Date(iso).getTime() + 5.5 * 3600000).toISOString().slice(0, 16) : "");
const toIso = (v?: string) => (v ? `${v}:00+05:30` : "");
const AUD: [string, string][] = [
  ["school", "School students"],
  ["college", "College students"],
  ["professional", "Professionals and organisations"],
  ["public", "Non-members (public)"],
];

/** Create or edit an event. Staff publish GRAAS events directly; experts and chapters send theirs to GRAAS for approval. */
export default function EventForm({ mode, initial, onDone, onCancel }: { mode: Mode; initial?: any; onDone: (msg: string) => void; onCancel: () => void }) {
  const kinds = EVENT_KINDS.filter((k) => k.hosts.includes(mode === "staff" ? "graas" : mode));
  const [f, setF] = useState<any>(() => ({
    kind: kinds[0].id,
    mode: "online",
    audience: mode === "chapter" ? ["college", "school"] : ["college", "professional", "public"],
    topics: [],
    certificate: true,
    ...(initial ?? {}),
    starts_at: toLocal(initial?.starts_at),
    ends_at: toLocal(initial?.ends_at),
    register_by: toLocal(initial?.register_by),
    price_member_inr: initial ? (initial.price_member_paise ?? 0) / 100 : 0,
    price_public_inr: initial ? (initial.price_public_paise ?? 0) / 100 : 0,
  }));
  const [err, setErr] = useState<{ field?: string; error: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const bad = (k: string) => (err?.field === k ? { "aria-invalid": true as const } : {});
  const lockedPrice = !!initial?.id && ["approved", "paused", "awaiting_fee"].includes(initial?.status) && mode !== "staff";

  async function save(draft: boolean) {
    setBusy(true);
    setErr(null);
    const body = { ...f, draft, starts_at: toIso(f.starts_at), ends_at: toIso(f.ends_at), register_by: toIso(f.register_by), capacity: f.capacity ? Number(f.capacity) : null, host_type: mode === "staff" ? "graas" : mode };
    const { data, error } = await browserClient().rpc("host_event_save", { p: body });
    setBusy(false);
    if (error || !data?.ok) return setErr({ field: data?.field, error: data?.error ?? "Could not save. Please check the details." });
    onDone(mode === "staff" ? `Saved (${data.ref}).` : draft ? "Saved as a draft." : `Sent to GRAAS for approval (${data.ref}). You get an email when it is published.`);
  }
  const lbl = "grid gap-1.5 font-medium";
  return (
    <div className="card grid gap-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="h-card !text-2xl">{initial?.id ? "Edit event" : mode === "chapter" ? "Announce a chapter event" : mode === "expert" ? "Create a session" : "Create a GRAAS event"}</h2>
          <p className="text-ink2">
            {mode === "staff"
              ? "Published as a GRAAS event. Set a member price (0 for free) and a price for others."
              : mode === "chapter"
                ? "Competitions, workshops, lectures, meetups and visits. GRAAS approves each one; chapter events are free to join."
                : "GRAAS checks every session. For paid sessions GRAAS confirms the fee model when it approves: a share of ticket sales, or a fixed listing fee with free entry."}
          </p>
        </div>
        <button type="button" className="btn btn-ghost !min-h-10" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <fieldset className="grid gap-2">
        <legend className="font-medium">Type</legend>
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {kinds.map((k) => (
            <button key={k.id} type="button" aria-pressed={f.kind === k.id} onClick={() => set("kind", k.id)} className={`rounded-2xl border p-3 text-left ${f.kind === k.id ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`}>
              <b className="block font-semibold">{k.label}</b>
              <span className={`text-sm ${f.kind === k.id ? "text-white/75" : "text-ink2"}`}>{k.note}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <label className={lbl}>
        Title
        <input className="field" maxLength={140} value={f.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="PLC programming for beginners: a live session" {...bad("title")} />
      </label>
      <label className={lbl}>
        One-line summary <span className="text-sm font-normal text-ink2">(optional)</span>
        <input className="field" maxLength={220} value={f.summary ?? ""} onChange={(e) => set("summary", e.target.value)} />
      </label>
      <label className={lbl}>
        Description
        <textarea className="field min-h-40" maxLength={8000} value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder={"What happens, step by step\nWho it is for and what to bring\nWhat people take away"} {...bad("description")} />
      </label>
      <div className="grid gap-1.5 font-medium">
        Topics
        <Tags value={f.topics ?? []} onChange={(v) => set("topics", v)} ph="PLC, ROS, safety… (press Enter)" max={10} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={lbl}>
          Speaker or judge <span className="text-sm font-normal text-ink2">(optional)</span>
          <input className="field" maxLength={120} value={f.speaker_name ?? ""} onChange={(e) => set("speaker_name", e.target.value)} />
        </label>
        <label className={`${lbl} sm:col-span-2`}>
          Their role
          <input className="field" maxLength={160} value={f.speaker_title ?? ""} onChange={(e) => set("speaker_title", e.target.value)} placeholder="Head of Automation, ACME Motors" />
        </label>
        <label className={`${lbl} sm:col-span-3`}>
          About the speaker
          <textarea className="field min-h-20" maxLength={1500} value={f.speaker_bio ?? ""} onChange={(e) => set("speaker_bio", e.target.value)} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={lbl}>
          Starts (IST)
          <input className="field" type="datetime-local" value={f.starts_at} onChange={(e) => set("starts_at", e.target.value)} {...bad("starts_at")} />
        </label>
        <label className={lbl}>
          Ends (IST)
          <input className="field" type="datetime-local" value={f.ends_at} onChange={(e) => set("ends_at", e.target.value)} {...bad("ends_at")} />
        </label>
        <label className={lbl}>
          Registration closes <span className="text-sm font-normal text-ink2">(optional)</span>
          <input className="field" type="datetime-local" value={f.register_by} onChange={(e) => set("register_by", e.target.value)} />
        </label>
        <label className={lbl}>
          Format
          <select className="field" value={f.mode} onChange={(e) => set("mode", e.target.value)}>
            <option value="online">Online</option>
            <option value="offline">In person</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </label>
        {f.mode !== "online" && (
          <>
            <label className={lbl}>
              Venue
              <input className="field" maxLength={200} value={f.venue ?? ""} onChange={(e) => set("venue", e.target.value)} {...bad("venue")} />
            </label>
            <label className={lbl}>
              City
              <input className="field" maxLength={80} value={f.city ?? ""} onChange={(e) => set("city", e.target.value)} />
            </label>
          </>
        )}
        {f.mode !== "offline" && (
          <label className={`${lbl} sm:col-span-2`}>
            Joining link <span className="text-sm font-normal text-ink2">(Zoom, Meet, YouTube; shown only to people registered)</span>
            <input className="field" maxLength={400} value={f.join_link ?? ""} onChange={(e) => set("join_link", e.target.value)} placeholder="https://" {...bad("join_link")} />
          </label>
        )}
        <label className={lbl}>
          Seats <span className="text-sm font-normal text-ink2">(empty = no limit)</span>
          <input className="field" type="number" min={1} value={f.capacity ?? ""} onChange={(e) => set("capacity", e.target.value)} />
        </label>
      </div>
      <fieldset className="grid gap-2" {...bad("audience")}>
        <legend className="font-medium">Who can register</legend>
        <div className="flex flex-wrap gap-2">
          {AUD.map(([k, l]) => {
            const on = (f.audience ?? []).includes(k);
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => set("audience", on ? f.audience.filter((x: string) => x !== k) : [...(f.audience ?? []), k])} className={`rounded-full border px-4 py-2 text-sm font-semibold ${on ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
                {l}
              </button>
            );
          })}
        </div>
        {mode === "chapter" && (
          <label className="mt-1 flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[#067a2e]" checked={!!f.chapter_only} onChange={(e) => set("chapter_only", e.target.checked)} />
            Only students of our chapter can register
          </label>
        )}
      </fieldset>
      {mode !== "chapter" && (
        <div className="grid gap-4 rounded-2xl bg-mist p-4 sm:grid-cols-2">
          <label className={lbl}>
            Fee for GRAAS members (₹)
            <input className="field" type="number" min={0} step={1} value={f.price_member_inr} disabled={lockedPrice} onChange={(e) => set("price_member_inr", e.target.value)} {...bad("price_member_inr")} />
            <span className="text-sm font-normal text-ink2">0 means free for members.</span>
          </label>
          <label className={lbl}>
            Fee for others (₹)
            <input className="field" type="number" min={0} step={1} value={f.price_public_inr} disabled={lockedPrice} onChange={(e) => set("price_public_inr", e.target.value)} />
            <span className="text-sm font-normal text-ink2">Members always pay the same or less.</span>
          </label>
          {lockedPrice && <p className="text-sm text-ink2 sm:col-span-2">Fees of a published session can be changed only by GRAAS.</p>}
        </div>
      )}
      <label className="flex items-center gap-3">
        <input type="checkbox" className="h-5 w-5 accent-[#067a2e]" checked={f.certificate !== false} onChange={(e) => set("certificate", e.target.checked)} />
        Attendees get a GRAAS participation certificate (after attendance is marked)
      </label>
      {err && (
        <p role="alert" className="rounded-xl border border-[#c2261a] bg-[#fff1ef] px-4 py-3 font-medium text-[#8f1a11]">
          {err.error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save(false)}>
          {busy ? "Saving…" : mode === "staff" ? "Save and publish" : "Send to GRAAS for approval"}
        </button>
        {mode !== "staff" && (!initial?.id || initial?.status === "draft") && (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => save(true)}>
            Save as draft
          </button>
        )}
      </div>
    </div>
  );
}
