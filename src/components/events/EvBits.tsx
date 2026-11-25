"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { inr } from "@/lib/money";

/* Shared pieces for events: labels, dates in India time, price, the card and the full description. */

export const EVENT_KINDS: { id: string; label: string; note: string; hosts: string[] }[] = [
  { id: "webinar", label: "Webinar", note: "Online talk with questions", hosts: ["graas", "expert"] },
  { id: "live_session", label: "Live session", note: "Hands-on online class", hosts: ["graas", "expert"] },
  { id: "lecture", label: "Industry lecture", note: "An industry leader speaks", hosts: ["graas", "expert", "chapter"] },
  { id: "workshop", label: "Workshop", note: "Build and practise, online or in a lab", hosts: ["graas", "expert", "chapter"] },
  { id: "competition", label: "Competition", note: "Teams compete for prizes", hosts: ["graas", "chapter"] },
  { id: "conference", label: "Conference", note: "Talks, papers and exhibits", hosts: ["graas"] },
  { id: "meetup", label: "Meetup", note: "Members meet and share", hosts: ["graas", "chapter"] },
  { id: "industrial_visit", label: "Industrial visit", note: "See automation on a real shop floor", hosts: ["graas", "chapter"] },
];
export const EVENT_LABEL = Object.fromEntries(EVENT_KINDS.map((k) => [k.id, k.label])) as Record<string, string>;
export const EV_STATUS: Record<string, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-mist text-ink2" },
  pending: { label: "Waiting for GRAAS", tone: "bg-[#fff6e5] text-[#7a4b00]" },
  awaiting_fee: { label: "Listing fee due", tone: "bg-[#fff6e5] text-[#7a4b00]" },
  approved: { label: "Published", tone: "bg-go-soft text-go-deep" },
  rejected: { label: "Sent back", tone: "bg-[#fff1ef] text-[#8f1a11]" },
  paused: { label: "Paused", tone: "bg-mist text-ink" },
  cancelled: { label: "Cancelled", tone: "bg-[#fff1ef] text-[#8f1a11]" },
  completed: { label: "Completed", tone: "bg-mist text-ink2" },
  removed: { label: "Removed", tone: "bg-[#fff1ef] text-[#8f1a11]" },
};
export const REG_STATUS: Record<string, { label: string; tone: string }> = {
  registered: { label: "Registered", tone: "bg-go-soft text-go-deep" },
  attended: { label: "Attended", tone: "bg-go text-white" },
  absent: { label: "Absent", tone: "bg-mist text-ink2" },
  cancelled: { label: "Cancelled", tone: "bg-mist text-ink2" },
  pending_payment: { label: "Payment pending", tone: "bg-[#fff6e5] text-[#7a4b00]" },
};

const IST = "Asia/Kolkata";
export const fmtDay = (d: string) => new Intl.DateTimeFormat("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
export const fmtTime = (d: string) => new Intl.DateTimeFormat("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" }).format(new Date(d));
export const fmtWhen = (e: any) => `${fmtDay(e.starts_at)}, ${fmtTime(e.starts_at)}${e.ends_at ? ` – ${new Date(e.ends_at).toDateString() === new Date(e.starts_at).toDateString() ? fmtTime(e.ends_at) : `${fmtDay(e.ends_at)}, ${fmtTime(e.ends_at)}`}` : ""} IST`;
export const where = (e: any) => (e.mode === "online" ? "Online" : [e.mode === "hybrid" ? "Online and" : null, e.venue, e.city].filter(Boolean).join(e.mode === "hybrid" ? " " : ", "));

export function priceLine(e: any) {
  const m = e.price_member_paise ?? 0, p = e.price_public_paise ?? 0;
  if (!m && !p) return "Free";
  if (!m) return `Free for members · ${inr(p)} for others`;
  if (m === p) return inr(p);
  return `${inr(m)} for members · ${inr(p)} for others`;
}

function DateTile({ d }: { d: string }) {
  const parts = new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short" }).formatToParts(new Date(d));
  return (
    <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-ink text-white">
      <span className="text-2xl font-semibold leading-none">{parts.find((x) => x.type === "day")?.value}</span>
      <span className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7fe0a0]">{parts.find((x) => x.type === "month")?.value}</span>
    </span>
  );
}

export function EventCard({ e, href, onOpen, badge, aside }: { e: any; href?: string; onOpen?: () => void; badge?: React.ReactNode; aside?: React.ReactNode }) {
  const body = (
    <>
      <DateTile d={e.starts_at} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-semibold">{e.kind_label ?? EVENT_LABEL[e.kind]}</span>
          <span className="text-xs font-semibold text-go-deep">{priceLine(e)}</span>
          {badge}
        </span>
        <span className="mt-1.5 block text-lg font-semibold leading-snug tracking-tight">{e.title}</span>
        <span className="block text-sm text-ink2">
          {fmtWhen(e)} · {where(e)}
        </span>
        <span className="mt-1 block text-sm font-medium">
          {e.speaker_name ? `${e.speaker_name}${e.speaker_title ? `, ${e.speaker_title}` : ""}` : `By ${e.host?.name ?? "GRAAS"}`}
        </span>
      </span>
    </>
  );
  const cls = "card card-lift flex w-full items-start gap-4 p-5 text-left";
  return (
    <div className="relative">
      {href ? (
        <Link href={href} className={cls}>
          {body}
        </Link>
      ) : onOpen ? (
        <button type="button" onClick={onOpen} className={cls}>
          {body}
        </button>
      ) : (
        <div className={cls}>{body}</div>
      )}
      {aside && <div className="absolute right-4 top-4">{aside}</div>}
    </div>
  );
}

export function EventBody({ e }: { e: any }) {
  const facts: [string, string | null][] = [
    ["When", fmtWhen(e)],
    ["Where", where(e)],
    ["Fee", priceLine(e)],
    ["Hosted by", e.host?.name ?? "GRAAS"],
    ["Seats", e.capacity ? `${Math.max(e.capacity - (e.seats_taken ?? 0), 0)} of ${e.capacity} left` : null],
    ["Register by", e.register_by ? `${fmtDay(e.register_by)}, ${fmtTime(e.register_by)}` : null],
    ["Certificate", e.certificate ? "Participation certificate for attendees" : null],
  ];
  return (
    <div className="grid gap-6">
      <dl className="grid gap-x-6 gap-y-3 rounded-2xl bg-mist p-5 sm:grid-cols-2">
        {facts
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate7">{k}</dt>
              <dd className="mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
      </dl>
      {e.summary && <p className="text-lg font-medium leading-relaxed">{e.summary}</p>}
      <div>
        <h3 className="h-card">About this {String(e.kind_label ?? "event").toLowerCase()}</h3>
        <p className="mt-2 whitespace-pre-line leading-relaxed text-ink2">{e.description}</p>
      </div>
      {(e.topics ?? []).length > 0 && (
        <p className="flex flex-wrap gap-2">
          {(e.topics as string[]).map((t) => (
            <span key={t} className="rounded-full border border-line bg-white px-3 py-1 text-sm font-medium">
              {t}
            </span>
          ))}
        </p>
      )}
      {e.speaker_name && (
        <div className="rounded-2xl border border-line p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate7">Speaker</p>
          <p className="mt-1 text-lg font-semibold">{e.speaker_name}</p>
          {e.speaker_title && <p className="text-ink2">{e.speaker_title}</p>}
          {e.speaker_bio && <p className="mt-2 whitespace-pre-line text-ink2">{e.speaker_bio}</p>}
        </div>
      )}
      {e.host?.headline && (
        <div className="rounded-2xl border border-line p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate7">Host</p>
          <p className="mt-1 font-semibold">{e.host.name}</p>
          <p className="text-ink2">{[e.host.headline, e.host.organisation].filter(Boolean).join(" · ")}</p>
        </div>
      )}
    </div>
  );
}
