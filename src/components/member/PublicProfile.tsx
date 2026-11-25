"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/site/Logo";
import { browserClient } from "@/lib/browser";
import { shortDate } from "@/lib/money";
import ProfileView from "./ProfileView";
import Qr from "./Qr";

/* The page behind every GRAAS QR code: graas.org.in/m/<member or chapter number>.
   It always shows whether the membership is genuine and current, straight from GRAAS records. The career
   profile appears only when the member has made it public (never for school students or members under 18).
   Mobile numbers, email addresses, dates of birth and guardian details are never sent to this page. */

const STATE: Record<string, { label: string; cls: string; text: string }> = {
  active: { label: "Verified, active member", cls: "bg-go text-ink", text: "This membership is current." },
  expired: { label: "Membership expired", cls: "bg-[#ffd9a3] text-[#5c3500]", text: "This membership has ended and has not been renewed." },
  suspended: { label: "Membership suspended", cls: "bg-[#ffc9c2] text-[#6e130c]", text: "This membership is suspended." },
  inactive: { label: "Not an active member", cls: "bg-white/80 text-ink", text: "This number does not belong to a current member." },
};
const KIND: Record<string, string> = { job: "Job", internship: "Internship", project: "Project", problem: "Problem statement", challenge: "Challenge", webinar: "Webinar", workshop: "Workshop", lecture: "Lecture", live_session: "Live session", competition: "Competition", meetup: "Meetup", visit: "Industrial visit", conference: "Conference" };

function Badge({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${ok ? "bg-go-soft text-go-deep" : "bg-mist text-ink2"}`}>
      {ok && (
        <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M2.5 7.5 5.8 10.5 11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {children}
    </span>
  );
}

function Docs({ list }: { list: any[] }) {
  const [err, setErr] = useState("");
  async function open(path: string) {
    const { data } = await browserClient().storage.from("member-docs").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    else setErr("This document could not be opened.");
  }
  return (
    <section className="card p-6 sm:p-8">
      <h2 className="h-card">Certificates and documents</h2>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {list.map((d) => (
          <li key={d.id} className="flex items-start justify-between gap-3 rounded-2xl border border-line p-4">
            <div className="min-w-0">
              <p className="font-semibold">{d.title}</p>
              <p className="text-sm text-ink2">{[d.kind === "resume" ? "Resume" : d.issuer, d.issued_on ? shortDate(d.issued_on) : null].filter(Boolean).join(" · ")}</p>
              {d.verified && <span className="mt-1.5 inline-block"><Badge ok>Verified by GRAAS</Badge></span>}
            </div>
            <button type="button" className="btn btn-ghost !min-h-9 shrink-0 !px-3 !py-1 text-sm" onClick={() => open(d.path)}>
              View
            </button>
          </li>
        ))}
      </ul>
      {err && <p className="mt-3 text-sm font-semibold text-[#8f1a11]">{err}</p>}
    </section>
  );
}

export default function PublicProfile({ no }: { no: string }) {
  const [r, setR] = useState<any>(undefined);
  const [copied, setCopied] = useState(false);
  const [checkedAt, setCheckedAt] = useState("");
  useEffect(() => {
    const sb = browserClient();
    sb.rpc("member_public", { p_no: no }).then(async ({ data, error }) => {
      // Before the public-profile update is live, fall back to the plain check.
      if (error) {
        const v = await sb.rpc("verify_member", { p_no: no });
        setR(v.data ?? { found: false });
      } else setR(data ?? { found: false });
      setCheckedAt(new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }));
      if (data?.public) {
        const key = `graas-seen-${no.toUpperCase()}`;
        try {
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, "1");
            sb.rpc("member_public_seen", { p_no: no });
          }
        } catch {
          /* Private browsing: the visit is simply not counted. */
        }
      }
    });
  }, [no]);

  if (r === undefined)
    return (
      <section className="bg-mist">
        <div className="shell py-12">
          <div className="h-56 animate-pulse rounded-[24px] bg-white" />
        </div>
      </section>
    );
  const url = typeof window === "undefined" ? `https://graas.org.in/m/${no}` : window.location.href.split("?")[0];
  if (!r.found)
    return (
      <section className="bg-mist">
        <div className="mx-auto max-w-xl px-5 py-16 text-center">
          <LogoMark size={52} />
          <h1 className="h-section mt-6">No GRAAS record for {no.toUpperCase()}</h1>
          <p className="lede mt-3">Check the number printed under the QR code. If it still does not match, the document may not be genuine.</p>
          <Link href="/verify" className="btn btn-primary mt-6">
            Check another number
          </Link>
        </div>
      </section>
    );

  const st = STATE[r.state ?? "inactive"] ?? STATE.inactive;
  const chapter = r.kind === "chapter";
  const org = !!r.org;
  const shownName = chapter ? r.name : org ? (r.organisation ?? r.name) : r.name;
  const pr = r.profile ?? {};
  const p = { id: r.photo?.path?.split("/")[0], photo_updated_at: r.photo ? String(r.photo.v) : null, full_name: r.name, organisation: org ? r.organisation : pr.organisation, designation: pr.designation, course: pr.course, branch: pr.branch, study_year: pr.study_year, city: pr.city };
  const mp = { ...pr, skills: pr.skills ?? [], links: pr.links ?? {} };

  return (
    <section className="bg-mist">
      <div className="shell grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:py-12">
        <div className="grid content-start gap-6">
          <div className="overflow-hidden rounded-[24px] bg-ink text-white shadow-[var(--shadow-card)]">
            <div className="relative grid gap-5 p-6 sm:p-8">
              <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:28px_28px]" aria-hidden="true" />
              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <span className="flex items-center gap-3">
                  <LogoMark size={40} tone="light" />
                  <span className="text-sm font-medium text-white/80">Global Robotics And Automation Society</span>
                </span>
                <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold ${st.cls}`}>
                  {r.state === "active" && <span className="h-2 w-2 animate-pulse rounded-full bg-ink" aria-hidden="true" />}
                  {st.label}
                </span>
              </div>
              <div className="relative">
                <p className="text-sm text-white/70">{chapter ? "GRAAS chapter" : org ? "GRAAS institutional member" : "GRAAS member"}</p>
                <h1 className="mt-1 text-[clamp(1.9rem,1.3rem+2vw,3rem)] font-semibold leading-tight tracking-tight">{shownName}</h1>
                {org && !chapter && r.name && <p className="mt-1 text-white/80">Represented by {r.name}</p>}
                {!chapter && r.chapter && <p className="mt-1 text-white/80">Member of {r.chapter}</p>}
                {chapter && r.organisation && <p className="mt-1 text-white/80">{[r.organisation, r.branch, r.city].filter(Boolean).join(" · ")}</p>}
              </div>
              <dl className="relative grid grid-cols-2 gap-4 border-t border-white/15 pt-5 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-white/60">{chapter ? "Chapter number" : "Member number"}</dt>
                  <dd className="readout mt-0.5 font-medium">{r.member_no}</dd>
                </div>
                <div>
                  <dt className="text-xs text-white/60">{chapter ? "Type" : "Membership"}</dt>
                  <dd className="mt-0.5 font-medium">{r.plan}</dd>
                </div>
                <div>
                  <dt className="text-xs text-white/60">{chapter ? "Approved" : "Member since"}</dt>
                  <dd className="mt-0.5 font-medium">{r.member_since ? shortDate(r.member_since) : "Not yet"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-white/60">Valid until</dt>
                  <dd className="mt-0.5 font-medium">{r.valid_until ? shortDate(r.valid_until) : "No end date"}</dd>
                </div>
              </dl>
            </div>
            <p className="bg-white/5 px-6 py-3 text-sm text-white/75 sm:px-8">
              {st.text} Checked against GRAAS records on {checkedAt}.
            </p>
          </div>

          {!chapter && (
            <div className="flex flex-wrap gap-2">
              {r.state === "active" && <Badge ok>Membership verified</Badge>}
              {r.pledged && <Badge ok>Took the GRAAS member pledge</Badge>}
              {Number(r.verified_docs) > 0 && <Badge ok>{r.verified_docs} {Number(r.verified_docs) === 1 ? "certificate" : "certificates"} verified by GRAAS</Badge>}
              {Number(r.events_attended) > 0 && <Badge ok>Attended {r.events_attended} GRAAS {Number(r.events_attended) === 1 ? "event" : "events"}</Badge>}
            </div>
          )}

          {chapter && (
            <div className="card p-6 sm:p-8">
              <h2 className="h-card">About this chapter</h2>
              <p className="mt-2 text-ink2">
                {r.members ?? 0} active {Number(r.members) === 1 ? "member" : "members"}. GRAAS chapters run competitions, workshops, lectures and industrial visits for their students.
              </p>
              {(r.events ?? []).length > 0 && (
                <ul className="mt-4 grid gap-2">
                  {r.events.map((e: any) => (
                    <li key={e.ref}>
                      <Link href={`/events/${String(e.ref).toLowerCase()}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-4 py-3 hover:border-ink">
                        <span className="font-semibold">{e.title}</span>
                        <span className="text-sm text-ink2">{[KIND[e.kind] ?? e.kind, shortDate(e.starts_at)].join(" · ")}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!chapter && r.public && <ProfileView p={p} mp={mp} plan={{ name: r.plan, audience: r.audience }} />}

          {!chapter && !r.public && (
            <div className="card p-6 text-ink2 sm:p-8">
              <p className="font-semibold text-ink">{r.school ? "School student profiles stay private." : "This member keeps their profile private."}</p>
              <p className="mt-1.5">The membership details above come straight from GRAAS records{r.state === "active" ? " and confirm that the person is a current member" : ""}.</p>
            </div>
          )}

          {r.public && (r.documents ?? []).length > 0 && <Docs list={r.documents} />}

          {r.public && (r.events ?? []).length > 0 && (
            <section className="card p-6 sm:p-8">
              <h2 className="h-card">GRAAS events attended</h2>
              <ul className="mt-4 grid gap-2 md:grid-cols-2">
                {r.events.map((e: any) => (
                  <li key={e.ref} className="rounded-xl border border-line px-4 py-3">
                    <p className="font-semibold">{e.title}</p>
                    <p className="text-sm text-ink2">{[KIND[e.kind] ?? e.kind, shortDate(e.starts_at)].join(" · ")}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {r.public && org && (r.opportunities ?? []).length > 0 && (
            <section className="card p-6 sm:p-8">
              <h2 className="h-card">Open opportunities</h2>
              <ul className="mt-4 grid gap-2 md:grid-cols-2">
                {r.opportunities.map((o: any) => (
                  <li key={o.ref}>
                    <Link href={`/opportunities/${String(o.ref).toLowerCase()}`} className="block rounded-xl border border-line px-4 py-3 hover:border-ink">
                      <p className="font-semibold">{o.title}</p>
                      <p className="text-sm text-ink2">{[KIND[o.kind] ?? o.kind, o.work_mode, o.location, o.apply_by ? `Apply by ${shortDate(o.apply_by)}` : null].filter(Boolean).join(" · ")}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="side-lock grid content-start gap-4">
          <div className="card grid justify-items-center gap-3 p-6 text-center">
            <Qr value={url} size={150} />
            <p className="readout text-sm">{r.member_no}</p>
            <p className="text-sm text-ink2">This page is the official GRAAS record. Share the link or the QR code.</p>
            <button
              type="button"
              className="btn btn-ghost !min-h-10"
              onClick={() =>
                navigator.clipboard?.writeText(url).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                })
              }
            >
              {copied ? "Link copied" : "Copy link"}
            </button>
          </div>
          {r.public && Number(r.views) > 0 && <p className="text-center text-sm text-ink2">Viewed {r.views} {Number(r.views) === 1 ? "time" : "times"}</p>}
          <div className="card grid gap-3 p-6">
            <p className="font-semibold">Is this you, or want a profile like this?</p>
            <p className="text-sm text-ink2">GRAAS members get a verified profile, resume builder, certificates and opportunities from industry.</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/membership" className="btn btn-primary !min-h-10">
                Become a member
              </Link>
              <Link href="/signin" className="btn btn-ghost !min-h-10">
                Sign in
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
