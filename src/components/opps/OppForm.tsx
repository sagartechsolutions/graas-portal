"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { BRANCHES, SKILLS } from "@/lib/suggest";
import { useState } from "react";
import { Tags } from "@/components/member/CareerProfile";
import { browserClient } from "@/lib/browser";
import { AUD_LABEL, KINDS, MODE_LABEL } from "./OppBits";

/** Post or edit an opportunity. Members send it to GRAAS for approval; staff publish directly. */
export default function OppForm({ initial, staff = false, onDone, onCancel }: { initial?: any; staff?: boolean; onDone: (msg: string) => void; onCancel: () => void }) {
  const [f, setF] = useState<any>(() => ({
    kind: "internship",
    audience: ["college"],
    work_mode: "onsite",
    skills: [],
    branches: [],
    ...(initial ?? {}),
  }));
  const [err, setErr] = useState<{ field?: string; error: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const bad = (k: string) => (err?.field === k ? { "aria-invalid": true as const } : {});
  const minToday = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);

  async function save(draft: boolean) {
    setBusy(true);
    setErr(null);
    const body = { ...f, draft, openings: f.openings ? Number(f.openings) : null };
    const { data, error } = await browserClient().rpc("org_opportunity_save", { p: body });
    setBusy(false);
    if (error || !data?.ok) return setErr({ field: data?.field, error: data?.error ?? "Could not save. Please check the details." });
    onDone(
      staff
        ? `Saved and published as ${data.ref}.`
        : draft
          ? "Saved as a draft. Send it to GRAAS when it is ready."
          : `Sent to GRAAS for approval (${data.ref}). You get an email when it is live, usually within one working day.`,
    );
  }

  const lbl = "grid gap-1.5 font-medium";
  return (
    <div className="card grid gap-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="h-card !text-2xl">{initial?.id ? "Edit opportunity" : "Post an opportunity"}</h2>
          <p className="text-ink2">{staff ? "Published at once under the organisation name you give." : "GRAAS checks every post before members see it. Editing a live post sends it for a quick re-check."}</p>
        </div>
        <button type="button" className="btn btn-ghost !min-h-10" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <fieldset className="grid gap-2">
        <legend className="font-medium">What are you offering?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {KINDS.map((k) => (
            <button key={k.id} type="button" aria-pressed={f.kind === k.id} onClick={() => set("kind", k.id)} className={`rounded-2xl border p-3.5 text-left transition-colors ${f.kind === k.id ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`}>
              <b className="block font-semibold">{k.label}</b>
              <span className={`text-sm ${f.kind === k.id ? "text-white/75" : "text-ink2"}`}>{k.note}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {staff && (
        <label className={lbl}>
          Organisation name
          <input className="field" maxLength={120} value={f.org_name ?? ""} onChange={(e) => set("org_name", e.target.value)} placeholder="GRAAS, or the company this is for" />
        </label>
      )}
      <label className={lbl}>
        Title
        <input className="field" maxLength={120} value={f.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="PLC and SCADA intern, packaging lines" {...bad("title")} />
      </label>
      <label className={lbl}>
        One-line summary <span className="text-sm font-normal text-ink2">(optional)</span>
        <input className="field" maxLength={200} value={f.summary ?? ""} onChange={(e) => set("summary", e.target.value)} placeholder="Six months on real machines, with a stipend and a job offer for the best interns." />
      </label>
      <label className={lbl}>
        Description
        <textarea className="field min-h-48" maxLength={6000} value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder={"What the work is\nWho it suits (course, year, experience)\nWhat they will learn or earn\nHow you select"} {...bad("description")} />
      </label>
      <div className="grid gap-1.5 font-medium">
        Skills you look for
        <Tags value={f.skills ?? []} onChange={(v) => set("skills", v)} ph="PLC, SCADA, AutoCAD… (press Enter)" max={15} suggest={SKILLS} />
        <span className="text-sm font-normal text-ink2">GRAAS uses these to suggest your top 5 matching members.</span>
      </div>

      <fieldset className="grid gap-2" {...bad("audience")}>
        <legend className="font-medium">Who can apply</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(AUD_LABEL).map(([k, label]) => {
            const on = (f.audience ?? []).includes(k);
            const blocked = k === "school" && ["job", "internship"].includes(f.kind);
            return (
              <button key={k} type="button" disabled={blocked} aria-pressed={on} onClick={() => set("audience", on ? f.audience.filter((x: string) => x !== k) : [...(f.audience ?? []), k])} className={`rounded-full border px-4 py-2 text-sm font-semibold ${on ? "border-ink bg-ink text-white" : "border-line bg-white"} disabled:opacity-40`}>
                {label}
              </button>
            );
          })}
        </div>
        {["job", "internship"].includes(f.kind) && <p className="text-sm text-ink2">Jobs and internships are for college students and professionals only.</p>}
      </fieldset>

      <div className="grid gap-1.5 font-medium">
        Branches <span className="text-sm font-normal text-ink2">(optional; leave empty for any branch)</span>
        <Tags value={f.branches ?? []} onChange={(v) => set("branches", v)} ph="Mechanical, Electrical, Mechatronics…" max={12} suggest={BRANCHES} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className={lbl}>
          Work mode
          <select className="field" value={f.work_mode} onChange={(e) => set("work_mode", e.target.value)}>
            {Object.entries(MODE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className={lbl}>
          Location
          <input className="field" maxLength={120} value={f.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="Area, city" />
        </label>
        <label className={lbl}>
          {f.kind === "challenge" ? "Prize" : f.kind === "job" ? "Salary" : "Stipend or pay"}
          <input className="field" maxLength={120} value={f.pay ?? ""} onChange={(e) => set("pay", e.target.value)} placeholder={f.kind === "job" ? "₹3–4 lakh a year" : f.kind === "challenge" ? "₹50,000 in prizes" : "₹10,000 a month"} />
        </label>
        <label className={lbl}>
          Duration
          <input className="field" maxLength={80} value={f.duration ?? ""} onChange={(e) => set("duration", e.target.value)} placeholder="6 months" />
        </label>
        <label className={lbl}>
          Openings
          <input className="field" type="number" min={1} max={1000} value={f.openings ?? ""} onChange={(e) => set("openings", e.target.value)} />
        </label>
        <label className={lbl}>
          Last date to apply
          <input className="field" type="date" min={minToday} value={f.apply_by ?? ""} onChange={(e) => set("apply_by", e.target.value)} {...bad("apply_by")} />
        </label>
        <label className={lbl}>
          Starts on
          <input className="field" type="date" value={f.starts_on ?? ""} onChange={(e) => set("starts_on", e.target.value)} />
        </label>
      </div>
      <label className={lbl}>
        What applicants should write <span className="text-sm font-normal text-ink2">(optional)</span>
        <textarea className="field min-h-20" maxLength={600} value={f.apply_note ?? ""} onChange={(e) => set("apply_note", e.target.value)} placeholder="Tell us about one machine or project you have worked on." />
      </label>

      {err && (
        <p role="alert" className="rounded-xl border border-[#c2261a] bg-[#fff1ef] px-4 py-3 font-medium text-[#8f1a11]">
          {err.error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save(false)}>
          {busy ? "Saving…" : staff ? "Publish" : "Send to GRAAS for approval"}
        </button>
        {!staff && (!initial?.id || initial?.status === "draft") && (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => save(true)}>
            Save as draft
          </button>
        )}
      </div>
      <p className="text-sm text-ink2">Members never see your phone number or email until you accept them. Do not put phone numbers in the description.</p>
    </div>
  );
}
