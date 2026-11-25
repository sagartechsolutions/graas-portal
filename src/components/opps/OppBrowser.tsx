"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { AUD_LABEL, KINDS, MODE_LABEL, OppCard } from "./OppBits";

/** The public list with search and filters. Each card opens the opportunity page. */
export default function OppBrowser({ items }: { items: any[] }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [mode, setMode] = useState("");
  const [aud, setAud] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items
      .filter((o) => !kind || o.kind === kind)
      .filter((o) => !mode || o.work_mode === mode)
      .filter((o) => !aud || (o.audience ?? []).includes(aud))
      .filter((o) => !s || [o.title, o.org_name, o.location, o.summary, ...(o.skills ?? [])].join(" ").toLowerCase().includes(s));
  }, [items, q, kind, mode, aud]);
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setKind("")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${!kind ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
          All ({items.length})
        </button>
        {KINDS.map((k) => {
          const n = items.filter((o) => o.kind === k.id).length;
          return (
            <button key={k.id} type="button" onClick={() => setKind(k.id)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${kind === k.id ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
              {k.label} {n ? `(${n})` : ""}
            </button>
          );
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input className="field" placeholder="Search by role, company, skill or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <select className="field" value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Work mode">
          <option value="">On site, remote or hybrid</option>
          {Object.entries(MODE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select className="field" value={aud} onChange={(e) => setAud(e.target.value)} aria-label="Open to">
          <option value="">Open to everyone</option>
          {Object.entries(AUD_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      {shown.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-lg font-semibold">{items.length === 0 ? "The first opportunities are on their way." : "Nothing matches these filters."}</p>
          <p className="mt-2 text-ink2">{items.length === 0 ? "GRAAS member companies are posting their first roles and challenges. Join now and your profile is ready when they go live." : "Try fewer filters or another search word."}</p>
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {shown.map((o) => (
            <li key={o.id}>
              <OppCard o={o} href={`/opportunities/${String(o.ref).toLowerCase()}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
