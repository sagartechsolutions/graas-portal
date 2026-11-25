"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { initials, usePhoto } from "@/components/member/Details";
import { shortDate } from "@/lib/money";

/* Shared pieces for opportunities: labels, the organisation logo, the card in lists and the full description. */

export const KINDS: { id: string; label: string; note: string }[] = [
  { id: "job", label: "Job", note: "A paid role, full or part time" },
  { id: "internship", label: "Internship", note: "Learning on the job, usually with a stipend" },
  { id: "project", label: "Project", note: "A defined piece of work for students or professionals" },
  { id: "problem", label: "Problem statement", note: "A real shop-floor problem to solve" },
  { id: "challenge", label: "Challenge", note: "A competition or hackathon with prizes" },
  { id: "training", label: "Training", note: "A course, apprenticeship or skill programme" },
];
export const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.id, k.label])) as Record<string, string>;
export const MODE_LABEL: Record<string, string> = { onsite: "On site", remote: "Remote", hybrid: "Hybrid" };
export const AUD_LABEL: Record<string, string> = { school: "School students", college: "College students", professional: "Professionals" };
export const APP_STATUS: Record<string, { label: string; tone: string }> = {
  invited: { label: "Invitation", tone: "bg-[#eef4ff] text-[#1d4ed8]" },
  applied: { label: "Applied", tone: "bg-mist text-ink" },
  shortlisted: { label: "Shortlisted", tone: "bg-go-soft text-go-deep" },
  interview: { label: "Interview", tone: "bg-go-soft text-go-deep" },
  selected: { label: "Selected", tone: "bg-go text-white" },
  rejected: { label: "Not taken forward", tone: "bg-[#fff1ef] text-[#8f1a11]" },
  withdrawn: { label: "Withdrawn", tone: "bg-mist text-ink2" },
  declined: { label: "Declined", tone: "bg-mist text-ink2" },
};
export const OPP_STATUS: Record<string, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-mist text-ink2" },
  pending: { label: "Waiting for GRAAS", tone: "bg-[#fff6e5] text-[#7a4b00]" },
  approved: { label: "Live", tone: "bg-go-soft text-go-deep" },
  rejected: { label: "Sent back", tone: "bg-[#fff1ef] text-[#8f1a11]" },
  paused: { label: "Paused", tone: "bg-mist text-ink" },
  closed: { label: "Closed", tone: "bg-mist text-ink2" },
  removed: { label: "Removed", tone: "bg-[#fff1ef] text-[#8f1a11]" },
};

export function daysLeft(d?: string | null) {
  if (!d) return null;
  const ms = new Date(d + "T23:59:59+05:30").getTime() - Date.now();
  const n = Math.ceil(ms / 86400000);
  return n < 0 ? "Closed" : n === 0 ? "Last day today" : n === 1 ? "1 day left" : n <= 30 ? `${n} days left` : `Apply by ${shortDate(d)}`;
}

export function OrgLogo({ org, name, size = 48 }: { org?: any; name: string; size?: number }) {
  const url = usePhoto(org?.id, org?.photo_updated_at);
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white font-semibold text-slate7" style={{ width: size, height: size, fontSize: size * 0.34 }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-contain p-1" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function OppMeta({ o, className = "" }: { o: any; className?: string }) {
  const bits = [MODE_LABEL[o.work_mode] && o.location ? `${MODE_LABEL[o.work_mode]}, ${o.location}` : MODE_LABEL[o.work_mode] ?? o.location, o.pay, o.duration, o.openings ? `${o.openings} ${o.openings === 1 ? "opening" : "openings"}` : null].filter(Boolean);
  return (
    <p className={`flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink2 ${className}`}>
      {bits.map((b, i) => (
        <span key={i} className="inline-flex items-center gap-3">
          {i > 0 && <span className="h-1 w-1 rounded-full bg-slate3" aria-hidden="true" />}
          {b}
        </span>
      ))}
    </p>
  );
}

/** One opportunity in a list. `href` makes it a link; `onOpen` a button; `aside` sits on the right. */
export function OppCard({ o, href, onOpen, aside, badge }: { o: any; href?: string; onOpen?: () => void; aside?: React.ReactNode; badge?: React.ReactNode }) {
  const left = daysLeft(o.apply_by);
  const body = (
    <>
      <OrgLogo org={o.org} name={o.org_name} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-semibold text-ink">{o.kind_label ?? KIND_LABEL[o.kind]}</span>
          {badge}
          {left && <span className={`text-xs font-semibold ${left.includes("left") || left.includes("today") ? "text-[#7a4b00]" : "text-ink2"}`}>{left}</span>}
        </span>
        <span className="mt-1.5 block text-lg font-semibold leading-snug tracking-tight">{o.title}</span>
        <span className="block text-[0.95rem] font-medium text-ink2">{o.org_name}</span>
        <OppMeta o={o} className="mt-1.5" />
        {(o.skills ?? []).length > 0 && (
          <span className="mt-2.5 flex flex-wrap gap-1.5">
            {(o.skills as string[]).slice(0, 6).map((s) => (
              <span key={s} className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium">
                {s}
              </span>
            ))}
          </span>
        )}
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

/** The full opportunity: what, who for, details and how to apply. */
export function OppBody({ o }: { o: any }) {
  const facts: [string, string | null][] = [
    ["Type", o.kind_label ?? KIND_LABEL[o.kind]],
    ["Where", [MODE_LABEL[o.work_mode], o.location].filter(Boolean).join(", ") || null],
    ["Pay or prize", o.pay],
    ["Duration", o.duration],
    ["Openings", o.openings ? String(o.openings) : null],
    ["Starts", o.starts_on ? shortDate(o.starts_on) : null],
    ["Apply by", o.apply_by ? shortDate(o.apply_by) : "Open until filled"],
    ["Open to", (o.audience ?? []).map((a: string) => AUD_LABEL[a]).join(", ")],
    ["Branches", (o.branches ?? []).length ? o.branches.join(", ") : null],
  ];
  return (
    <div className="grid gap-6">
      <dl className="grid gap-x-6 gap-y-3 rounded-2xl bg-mist p-5 sm:grid-cols-3">
        {facts
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate7">{k}</dt>
              <dd className="mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
      </dl>
      {o.summary && <p className="text-lg font-medium leading-relaxed">{o.summary}</p>}
      <div>
        <h3 className="h-card">About the opportunity</h3>
        <p className="mt-2 whitespace-pre-line leading-relaxed text-ink2">{o.description}</p>
      </div>
      {(o.skills ?? []).length > 0 && (
        <div>
          <h3 className="h-card">Skills they look for</h3>
          <p className="mt-2 flex flex-wrap gap-2">
            {(o.skills as string[]).map((s) => (
              <span key={s} className="rounded-full border border-line bg-white px-3 py-1 text-sm font-medium">
                {s}
              </span>
            ))}
          </p>
        </div>
      )}
      {o.apply_note && (
        <div className="rounded-2xl border border-line p-5">
          <h3 className="font-semibold">When you apply</h3>
          <p className="mt-1 whitespace-pre-line text-ink2">{o.apply_note}</p>
        </div>
      )}
      {(o.org?.about || o.org?.website) && (
        <div className="flex items-start gap-4 rounded-2xl border border-line p-5">
          <OrgLogo org={o.org} name={o.org_name} size={56} />
          <div>
            <h3 className="font-semibold">About {o.org_name}</h3>
            <p className="text-sm text-ink2">{[o.org?.sector, o.org?.size, o.org?.city].filter(Boolean).join(" · ")}</p>
            {o.org?.about && <p className="mt-2 whitespace-pre-line text-ink2">{o.org.about}</p>}
            {o.org?.website && (
              <a href={o.org.website} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold underline decoration-go decoration-2 underline-offset-4">
                {o.org.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
