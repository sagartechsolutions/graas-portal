"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { phoneText, phoneHref } from "@/lib/format";
import { initials, usePhoto } from "./Details";

/* A member's career profile as others see it (LinkedIn-style). Contact details are shown only when
   `showContact` is true: to the member themselves, or to a company after both sides have accepted. */

export const OPEN_TO: Record<string, string> = {
  jobs: "Jobs",
  internships: "Internships",
  projects: "Projects",
  challenges: "Challenges and competitions",
  mentoring: "Mentoring",
  sessions: "Speaking at sessions",
};

export const period = (from?: string, to?: string, current?: boolean) => [from, current ? "Present" : to].filter(Boolean).join(" – ");

export function courseLine(p: any) {
  const course = p.course === "Other" ? p.course_other : p.course;
  const branch = p.branch === "Other" ? p.branch_other : p.branch;
  return [course, branch, p.study_year].filter(Boolean).join(", ");
}

/** The strength meter: what a complete profile has, in the order members usually fill it. */
export function strength(p: any, mp: any, org: boolean) {
  const has = (v: any) => (Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim() !== "" : !!v);
  const checks: [string, boolean][] = org
    ? [
        ["Logo", !!p.photo_updated_at],
        ["About the organisation", has(mp.org_about)],
        ["Sector", has(mp.org_sector)],
        ["Website", has(mp.org_website)],
        ["Focus areas", has(mp.skills)],
      ]
    : [
        ["Photo", !!p.photo_updated_at],
        ["Headline", has(mp.headline)],
        ["About you", has(mp.about)],
        ["At least 5 skills", (mp.skills ?? []).length >= 5],
        ["Education", has(mp.education)],
        ["A project", has(mp.projects)],
        ["Experience or an achievement", has(mp.experience) || has(mp.achievements)],
        ["A link (LinkedIn or GitHub)", Object.keys(mp.links ?? {}).length > 0],
      ];
  const done = checks.filter(([, ok]) => ok).length;
  return { pct: Math.round((done / checks.length) * 100), missing: checks.filter(([, ok]) => !ok).map(([k]) => k) };
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate7">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function ProfileView({ p, mp, plan, showContact = false, note }: { p: any; mp: any; plan?: { name?: string; audience?: string; code?: string } | null; showContact?: boolean; note?: React.ReactNode }) {
  const org = plan?.audience === "institution" || plan?.audience === "industry";
  const photo = usePhoto(p.id, p.photo_updated_at);
  const name = org ? p.organisation || p.full_name : p.full_name;
  const sub = org ? [mp.org_sector, mp.org_size, p.city].filter(Boolean).join(" · ") : [p.designation && p.organisation ? `${p.designation}, ${p.organisation}` : p.organisation, courseLine(p), p.city].filter(Boolean).join(" · ");
  const links = Object.entries(mp.links ?? {}) as [string, string][];
  return (
    <article className="card overflow-hidden">
      <div className="h-20 bg-[linear-gradient(110deg,#000e21_0%,#0b2440_60%,#067a2e_140%)]" aria-hidden="true" />
      <div className="px-6 pb-6 sm:px-8 sm:pb-8">
        <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
          <div className={`h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-mist shadow-[var(--shadow-card)] ${org ? "bg-white" : ""}`}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className={`h-full w-full ${org ? "object-contain p-2" : "object-cover"}`} />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate5">{initials(name ?? "")}</span>
            )}
          </div>
          {plan?.name && (
            <span className="mb-1 inline-flex items-center gap-2 rounded-full bg-go-soft px-3 py-1 text-sm font-semibold text-go-deep">
              <span className="dot" aria-hidden="true" /> GRAAS {plan.code === "school-student" ? "School Student" : plan.name} member
            </span>
          )}
        </div>
        <div className="mt-3 min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight">{name}</h2>
          {!org && mp.headline && <p className="mt-0.5 font-medium text-ink">{mp.headline}</p>}
          {sub && <p className="mt-0.5 text-sm text-ink2">{sub}</p>}
        </div>

        {note && <div className="mt-4">{note}</div>}

        {showContact ? (
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {p.email && <span>Email: <a className="font-semibold underline" href={`mailto:${p.email}`}>{p.email}</a></span>}
            {p.phone && <span>Mobile: <a className="font-semibold underline" href={phoneHref(p.phone)}>{phoneText(p.phone)}</a></span>}
          </p>
        ) : null}

        {!org && (mp.open_to ?? []).length > 0 && (
          <p className="mt-4 rounded-xl bg-mist px-4 py-3 text-sm">
            <b className="font-semibold">Open to:</b> {(mp.open_to as string[]).map((x) => OPEN_TO[x] ?? x).join(", ")}
            {(mp.locations ?? []).length > 0 ? ` · Prefers ${(mp.locations as string[]).join(", ")}` : ""}
          </p>
        )}

        <div className="mt-6 grid gap-6">
          {(org ? mp.org_about : mp.about) && (
            <Block title={org ? "About the organisation" : "About"}>
              <p className="whitespace-pre-line leading-relaxed text-ink2">{org ? mp.org_about : mp.about}</p>
              {org && mp.org_website && (
                <p className="mt-2">
                  <a href={mp.org_website} target="_blank" rel="noreferrer" className="font-semibold underline decoration-go decoration-2 underline-offset-4">
                    {mp.org_website.replace(/^https?:\/\//, "")}
                  </a>
                </p>
              )}
            </Block>
          )}
          {(mp.skills ?? []).length > 0 && (
            <Block title={org ? "Focus areas" : "Skills"}>
              <ul className="flex flex-wrap gap-2">
                {(mp.skills as string[]).map((s) => (
                  <li key={s} className="rounded-full border border-line bg-white px-3 py-1 text-sm font-medium">
                    {s}
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {(mp.experience ?? []).length > 0 && (
            <Block title="Experience">
              <ol className="grid gap-4">
                {(mp.experience as any[]).map((x, i) => (
                  <li key={i} className="grid grid-cols-[0.75rem_1fr] gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-go" aria-hidden="true" />
                    <div>
                      <p className="font-semibold">{x.title}{x.org ? `, ${x.org}` : ""}</p>
                      <p className="text-sm text-ink2">{[x.kind, x.place, period(x.from, x.to, x.current)].filter(Boolean).join(" · ")}</p>
                      {x.summary && <p className="mt-1 whitespace-pre-line text-ink2">{x.summary}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </Block>
          )}
          {(mp.education ?? []).length > 0 && (
            <Block title="Education">
              <ul className="grid gap-3">
                {(mp.education as any[]).map((x, i) => (
                  <li key={i}>
                    <p className="font-semibold">{x.course}</p>
                    <p className="text-sm text-ink2">{[x.institute, x.board, period(x.from, x.to), x.score].filter(Boolean).join(" · ")}</p>
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {(mp.projects ?? []).length > 0 && (
            <Block title="Projects">
              <ul className="grid gap-3 sm:grid-cols-2">
                {(mp.projects as any[]).map((x, i) => (
                  <li key={i} className="rounded-2xl border border-line p-4">
                    <p className="font-semibold">{x.title}</p>
                    <p className="text-sm text-ink2">{[x.role, x.year].filter(Boolean).join(" · ")}</p>
                    {x.summary && <p className="mt-1.5 text-sm text-ink2">{x.summary}</p>}
                    {x.tools && <p className="mt-1.5 text-sm"><b className="font-semibold">Tools:</b> {x.tools}</p>}
                    {x.link && (
                      <a href={x.link} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-sm font-semibold underline">
                        View project
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {(mp.achievements ?? []).length > 0 && (
            <Block title="Achievements">
              <ul className="grid gap-2">
                {(mp.achievements as any[]).map((x, i) => (
                  <li key={i}>
                    <span className="font-semibold">{x.title}</span>
                    {x.year ? <span className="text-ink2"> · {x.year}</span> : null}
                    {x.detail && <p className="text-sm text-ink2">{x.detail}</p>}
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {(mp.certifications ?? []).length > 0 && (
            <Block title="Certifications">
              <ul className="grid gap-2 sm:grid-cols-2">
                {(mp.certifications as any[]).map((x, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-semibold">{x.name}</span>
                    <span className="text-ink2">{[x.issuer, x.year].filter(Boolean).length ? ` · ${[x.issuer, x.year].filter(Boolean).join(", ")}` : ""}</span>
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {((mp.languages ?? []).length > 0 || links.length > 0) && (
            <Block title="More">
              {(mp.languages ?? []).length > 0 && <p className="text-ink2"><b className="font-semibold text-ink">Languages:</b> {(mp.languages as string[]).join(", ")}</p>}
              {links.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-3">
                  {links.map(([k, v]) => (
                    <a key={k} href={v} target="_blank" rel="noreferrer" className="rounded-full bg-mist px-3 py-1 text-sm font-semibold capitalize">
                      {k}
                    </a>
                  ))}
                </p>
              )}
            </Block>
          )}
        </div>
      </div>
    </article>
  );
}
