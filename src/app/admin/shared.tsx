"use client";

import type { Session } from "@supabase/supabase-js";
import { browserClient } from "@/lib/browser";

export const sb = () => browserClient();

/** Tells the website to refresh its saved copies of plans, settings, posts, gallery and policies. */
export async function refreshSite(session: Session) {
  await fetch("/api/revalidate", { method: "POST", headers: { authorization: `Bearer ${session.access_token}` } }).catch(() => {});
}

const TONES = { good: "bg-go-soft text-go-deep", warn: "bg-[#fff4e5] text-[#8a4b00]", bad: "bg-[#fff1ef] text-[#8f1a11]", plain: "bg-mist text-ink2", ink: "bg-ink text-white" } as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "plain", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}
export function Msg({ tone = "plain", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <p role="status" className={`rounded-xl px-4 py-2.5 text-[0.95rem] font-medium ${TONES[tone]}`}>
      {children}
    </p>
  );
}
export function Stat({ label, value, note, tone }: { label: string; value: React.ReactNode; note?: string; tone?: Tone }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-ink2">{label}</p>
      <p className="readout mt-1.5 text-3xl font-medium tracking-tight">{value}</p>
      {note && <p className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone ?? "plain"]}`}>{note}</p>}
    </div>
  );
}

export const STATUS_TONE: Record<string, Tone> = { pending_approval: "warn", pending_payment: "warn", active: "good", expired: "bad", suspended: "bad", rejected: "plain", cancelled: "plain" };

export function downloadCsv(name: string, rows: (string | number | null | undefined)[][]) {
  const text = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv" }));
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const small = "btn btn-quiet !min-h-9 !px-3 !py-1 text-sm";
export const lbl = "grid gap-1 text-sm font-semibold";
export const istToday = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
