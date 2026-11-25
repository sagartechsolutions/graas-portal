"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { EVENT_KINDS, EventCard } from "./EvBits";

export default function EventBrowser({ items }: { items: any[] }) {
  const [kind, setKind] = useState("");
  const [past, setPast] = useState(false);
  const shown = useMemo(() => items.filter((e) => !!e.past === past).filter((e) => !kind || e.kind === kind), [items, kind, past]);
  const upcoming = items.filter((e) => !e.past).length;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-white p-1 shadow-[var(--shadow-card)]">
          <button type="button" onClick={() => setPast(false)} className={`rounded-full px-4 py-2 text-sm font-semibold ${!past ? "bg-ink text-white" : "text-ink2"}`}>
            Upcoming ({upcoming})
          </button>
          <button type="button" onClick={() => setPast(true)} className={`rounded-full px-4 py-2 text-sm font-semibold ${past ? "bg-ink text-white" : "text-ink2"}`}>
            Past ({items.length - upcoming})
          </button>
        </div>
        <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
        <button type="button" onClick={() => setKind("")} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${!kind ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
          All types
        </button>
        {EVENT_KINDS.filter((k) => items.some((e) => e.kind === k.id)).map((k) => (
          <button key={k.id} type="button" onClick={() => setKind(k.id)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${kind === k.id ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
            {k.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-lg font-semibold">{past ? "No past events yet." : "The next sessions are being scheduled."}</p>
          <p className="mt-2 text-ink2">{past ? "Events appear here after they run." : "Members get an email when registration opens. Many sessions are free for members."}</p>
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {shown.map((e) => (
            <li key={e.id}>
              <EventCard e={e} href={`/events/${String(e.ref).toLowerCase()}`} badge={e.status === "completed" ? <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-semibold">Completed</span> : null} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
