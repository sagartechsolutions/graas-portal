"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { browserClient } from "@/lib/browser";
import { shortDate } from "@/lib/money";
import { initials, isIndividual, usePhoto } from "./Details";
import ProfileView, { courseLine, strength } from "./ProfileView";
import Qr from "./Qr";

/* The page an active member lands on: their profile, LinkedIn style, with how complete it is, who has seen it,
   the public QR page, and the next useful things to do. */

const sb = () => browserClient();

export const COVERS: Record<string, { name: string; cls: string }> = {
  circuit: { name: "Circuit", cls: "bg-ink [background-image:radial-gradient(circle_at_20%_120%,rgba(2,174,62,.45),transparent_45%),linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:auto,22px_22px,22px_22px]" },
  gradient: { name: "Gradient", cls: "bg-[linear-gradient(110deg,#000e21_0%,#0b2440_55%,#067a2e_130%)]" },
  blueprint: { name: "Blueprint", cls: "bg-[#0b2a4a] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:60px_60px,60px_60px,12px_12px,12px_12px]" },
  grid: { name: "Light grid", cls: "bg-mist [background-image:linear-gradient(#e2e4e9_1px,transparent_1px),linear-gradient(90deg,#e2e4e9_1px,transparent_1px)] [background-size:24px_24px]" },
  plain: { name: "Plain", cls: "bg-[#e9ecf2]" },
};

function Ring({ pct }: { pct: number }) {
  const r = 26,
    c = 2 * Math.PI * r;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#e2e4e9" strokeWidth="6" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="#02ae3e" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 32 32)" style={{ transition: "stroke-dasharray .8s ease" }} />
      <text x="32" y="37" textAnchor="middle" className="readout" fontSize="15" fontWeight="600" fill="#000e21">
        {pct}%
      </text>
    </svg>
  );
}

function Tile({ value, label, hint, onClick }: { value: React.ReactNode; label: string; hint?: string; onClick?: () => void }) {
  const C = onClick ? "button" : "div";
  return (
    <C type={onClick ? "button" : undefined} onClick={onClick} className={`card card-lift grid content-start gap-1 p-5 text-left ${onClick ? "cursor-pointer" : ""}`}>
      <span className="readout text-3xl font-medium tracking-tight">{value}</span>
      <span className="font-semibold">{label}</span>
      {hint && <span className="text-sm text-ink2">{hint}</span>}
    </C>
  );
}

export default function ProfileHome({ a, state, go }: { a: any; state: string; go: (tab: string) => void }) {
  const [mp, setMp] = useState<any>(null);
  const [pub, setPub] = useState<any>(null);
  const [rec, setRec] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [opps, setOpps] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const p = a.profile,
    m = a.membership;
  const org = !!m && !isIndividual(m.plan?.audience);
  const photo = usePhoto(p.id, p.photo_updated_at);
  const load = useCallback(async () => {
    const [pr, pb, dd] = await Promise.all([sb().rpc("my_profile"), sb().rpc("my_public"), sb().rpc("my_documents")]);
    setMp(pr.data ?? {});
    setPub(pb.error ? null : pb.data);
    setDocs(Array.isArray(dd.data) ? dd.data : []);
    if (m?.member_no) {
      const r = await sb().rpc("member_public", { p_no: m.member_no });
      setRec(r.error ? null : r.data);
    }
  }, [m?.member_no]);
  useEffect(() => {
    load();
    const q = org ? sb().from("opportunities").select("id", { count: "exact", head: true }).eq("poster", p.id) : sb().from("opportunities").select("id", { count: "exact", head: true }).eq("status", "approved");
    q.then(({ count }) => setOpps(count ?? 0));
  }, [load, org, p.id]);

  async function savePrefs(x: any, ok: string) {
    setBusy(true);
    setMsg(null);
    const { data, error } = await sb().rpc("member_profile_prefs", { p: x });
    setBusy(false);
    if (error || !data?.ok) return setMsg({ tone: "bad", text: data?.error ?? "That could not be saved just now." });
    setMsg({ tone: "good", text: ok });
    load();
  }

  if (!mp) return <div className="card p-8 text-ink2">Loading your profile…</div>;
  const s = strength(p, mp, org);
  const name = org ? p.organisation || p.full_name : p.full_name;
  const url = m?.member_no ? `https://graas.org.in/m/${m.member_no}` : "";
  const cover = COVERS[pub?.cover_style ?? "circuit"] ?? COVERS.circuit;
  const darkCover = !["grid", "plain"].includes(pub?.cover_style ?? "circuit");
  const verified = docs.filter((d) => d.verify_status === "verified").length;
  const typeName = m?.plan?.code === "school-student" ? "School Student" : m?.plan?.name;
  const sub = org ? [mp.org_sector, p.city].filter(Boolean).join(" · ") : [p.designation && p.organisation ? `${p.designation}, ${p.organisation}` : p.organisation, courseLine(p), p.city].filter(Boolean).join(" · ");
  const coverKeys = Object.keys(COVERS);
  const nextCover = coverKeys[(coverKeys.indexOf(pub?.cover_style ?? "circuit") + 1) % coverKeys.length];

  const steps: { done: boolean; t: string; d: string; tab: string }[] = [
    { done: !!p.pledged_at, t: "Take the GRAAS pledge", d: "Seven promises every member makes. You get a pledge certificate.", tab: "home" },
    { done: !!p.photo_updated_at, t: org ? "Add your logo" : "Add your photo", d: "Needed for your ID card and certificate.", tab: "profile" },
    { done: s.pct >= 80, t: org ? "Complete the company page" : "Complete your career profile", d: s.missing.length ? `Still missing: ${s.missing.slice(0, 3).join(", ")}${s.missing.length > 3 ? "…" : ""}` : "Looks complete.", tab: "career" },
    ...(org
      ? [{ done: (opps ?? 0) > 0, t: "Post an opportunity", d: "A job, internship, project or challenge for GRAAS students.", tab: "opportunities" }]
      : [
          { done: docs.length > 0, t: "Upload certificates", d: "Ask GRAAS to verify them for a green badge.", tab: "documents" },
          { done: !!pub?.public_profile, t: "Make your profile public", d: "So the QR on your resume and ID opens it.", tab: "home" },
        ]),
    { done: false, t: "Host a session", d: "Teach a webinar, lecture or workshop for members.", tab: "host" },
  ];

  return (
    <div className="grid gap-6">
      <article className="card overflow-hidden">
        <div className={`relative h-36 sm:h-44 ${cover.cls}`}>
          <button type="button" disabled={busy || !pub} onClick={() => savePrefs({ cover_style: nextCover }, `Cover changed to ${COVERS[nextCover].name}.`)} className={`absolute right-3 top-3 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur ${darkCover ? "bg-white/15 text-white hover:bg-white/25" : "bg-white/80 text-ink hover:bg-white"}`}>
            Change cover
          </button>
        </div>
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-14 flex flex-wrap items-end justify-between gap-4 sm:-mt-16">
            <button type="button" onClick={() => go("profile")} title={org ? "Change logo" : "Change photo"} className={`group relative h-28 w-28 shrink-0 overflow-hidden rounded-[22px] border-4 border-white bg-mist shadow-[var(--shadow-card)] sm:h-32 sm:w-32 ${org ? "bg-white" : ""}`}>
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className={`h-full w-full ${org ? "object-contain p-2" : "object-cover"}`} />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-3xl font-semibold text-slate5">{initials(name ?? "")}</span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-1 text-center text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">{p.photo_updated_at ? "Change" : "Add photo"}</span>
            </button>
            <div className="flex flex-wrap gap-2 pt-3 sm:pt-0">
              <button type="button" className="btn btn-primary !min-h-11" onClick={() => go("career")}>
                {org ? "Edit company page" : "Edit profile"}
              </button>
              {!org && (
                <button type="button" className="btn btn-ghost !min-h-11" onClick={() => go("resume")}>
                  Resume
                </button>
              )}
              {url && (
                <a href={url} target="_blank" rel="noreferrer" className="btn btn-ghost !min-h-11">
                  Public page
                </a>
              )}
            </div>
          </div>
            <div className="mt-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[clamp(1.6rem,1.2rem+1.2vw,2.2rem)] font-semibold leading-tight tracking-tight">{name}</h2>
                {state === "active" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-go-soft px-2.5 py-0.5 text-xs font-semibold text-go-deep" title="Membership verified by GRAAS">
                    <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
                      <path d="M2.5 7.5 5.8 10.5 11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Verified member
                  </span>
                )}
              </div>
              {!org && mp.headline ? <p className="mt-0.5 text-lg font-medium">{mp.headline}</p> : !org && <button type="button" className="mt-0.5 text-left font-medium text-go-deep underline decoration-go decoration-2 underline-offset-4" onClick={() => go("career")}>Add a headline, for example “Final-year Mechatronics student, robotics and PLC”</button>}
              {sub && <p className="mt-0.5 text-ink2">{sub}</p>}
              {m?.member_no && (
                <p className="mt-1.5 text-sm text-ink2">
                  <span className="readout font-medium text-ink">{m.member_no}</span> · GRAAS {typeName} member{m.ends_on ? ` · valid until ${shortDate(m.ends_on)}` : ""}
                </p>
              )}
            </div>
        </div>
      </article>

      {msg && (
        <p role="status" className={`rounded-2xl px-4 py-3 font-medium ${msg.tone === "good" ? "bg-go-soft text-go-deep" : "bg-[#fff1ef] text-[#8f1a11]"}`}>
          {msg.text}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button type="button" onClick={() => go("career")} className="card card-lift flex items-center gap-4 p-5 text-left">
          <Ring pct={s.pct} />
          <span>
            <span className="block font-semibold">Profile strength</span>
            <span className="block text-sm text-ink2">{s.pct === 100 ? "Complete. Well done." : `${s.missing.length} ${s.missing.length === 1 ? "thing" : "things"} to add`}</span>
          </span>
        </button>
        <Tile value={pub?.public_profile ? (pub?.views ?? 0) : "–"} label="Public profile views" hint={pub?.public_profile ? "Since you made it public" : "Your profile is private"} />
        {org ? <Tile value={opps ?? "…"} label="Opportunities posted" hint="Jobs, internships and projects" onClick={() => go("opportunities")} /> : <Tile value={verified} label="Certificates verified" hint={docs.length ? `${docs.length} uploaded` : "Upload your first"} onClick={() => go("documents")} />}
        {org ? <Tile value={rec?.events_attended ?? 0} label="Events attended" hint="Sessions, workshops and lectures" onClick={() => go("events")} /> : <Tile value={opps ?? "…"} label="Open opportunities" hint="Jobs, internships, projects" onClick={() => go("opportunities")} />}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-6">
          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="h-card">Your next steps</h3>
              <span className="readout text-sm text-ink2">
                {steps.filter((x) => x.done).length} of {steps.length} done
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-mist">
              <div className="h-full rounded-full bg-go transition-[width] duration-700" style={{ width: `${(steps.filter((x) => x.done).length / steps.length) * 100}%` }} />
            </div>
            <ul className="mt-4 grid gap-2 md:grid-cols-2">
              {steps.map((x) => (
                <li key={x.t}>
                  <button
                    type="button"
                    disabled={x.done}
                    onClick={() => (x.tab === "home" ? document.getElementById(x.t.includes("pledge") ? "take-pledge" : "public-profile")?.scrollIntoView({ behavior: "smooth", block: "center" }) : go(x.tab))}
                    className={`flex h-full w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${x.done ? "border-transparent bg-mist" : "border-line hover:border-ink"}`}
                  >
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${x.done ? "bg-go text-ink" : "border-2 border-line"}`} aria-hidden="true">
                      {x.done && (
                        <svg width="12" height="12" viewBox="0 0 14 14">
                          <path d="M2.5 7.5 5.8 10.5 11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span>
                      <span className={`block font-semibold ${x.done ? "text-ink2 line-through decoration-1" : ""}`}>{x.t}</span>
                      <span className="block text-sm text-ink2">{x.d}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <div>
            <p className="mb-2 text-sm font-semibold text-ink2">How others see your profile</p>
            <ProfileView p={p} mp={mp} plan={m?.plan} />
          </div>
        </div>

        <aside className="side-lock-xl grid content-start gap-4">
          <section id="public-profile" className="card grid gap-4 p-5">
            <div>
              <h3 className="font-semibold">Public profile and QR</h3>
              <p className="text-sm text-ink2">The QR on your ID card, certificates and resume opens your GRAAS page. It always shows that your membership is genuine.</p>
            </div>
            {url && state === "active" ? (
              <>
                <div className="flex items-center gap-4">
                  <Qr value={url} size={96} className="rounded-lg ring-1 ring-line" />
                  <div className="min-w-0 text-sm">
                    <p className="readout break-all font-medium">graas.org.in/m/{m.member_no}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" className="btn btn-ghost !min-h-8 !px-3 !py-0.5 text-sm" onClick={() => navigator.clipboard?.writeText(url).then(() => setMsg({ tone: "good", text: "Link copied. Paste it on LinkedIn, in an email or on your resume." }))}>
                        Copy link
                      </button>
                      <a className="btn btn-ghost !min-h-8 !px-3 !py-0.5 text-sm" href={url} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    </div>
                  </div>
                </div>
                {pub ? (
                  pub.can_be_public ? (
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-mist p-3">
                      <input type="checkbox" className="peer sr-only" checked={!!pub.public_profile} disabled={busy} onChange={(e) => savePrefs({ public_profile: e.target.checked }, e.target.checked ? "Your profile is now public at your GRAAS page." : "Your profile is private again. The page still confirms your membership.")} />
                      <span className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ink ${pub.public_profile ? "bg-go" : "bg-line"}`} aria-hidden="true">
                        <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${pub.public_profile ? "translate-x-5" : ""}`} />
                      </span>
                      <span className="text-sm">
                        <b className="block font-semibold">Show my career profile publicly</b>
                        <span className="text-ink2">Headline, skills, experience, projects and the documents you choose. Your mobile and email are never shown.</span>
                      </span>
                    </label>
                  ) : (
                    <p className="rounded-xl bg-mist p-3 text-sm text-ink2">{m?.plan?.code === "school-student" ? "School student profiles stay private." : "Public profiles are for members aged 18 or over."} Your QR still shows that your membership is genuine.</p>
                  )
                ) : (
                  <p className="rounded-xl bg-mist p-3 text-sm text-ink2">Public profiles are being switched on. Check back shortly.</p>
                )}
              </>
            ) : (
              <p className="rounded-xl bg-mist p-3 text-sm text-ink2">Your QR page appears once your membership is active.</p>
            )}
          </section>

          {m && (
            <section className="card grid gap-3 p-5">
              <h3 className="font-semibold">Membership</h3>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-ink2">Type</dt>
                  <dd className="font-semibold">{typeName}</dd>
                </div>
                <div>
                  <dt className="text-ink2">Status</dt>
                  <dd className="font-semibold capitalize">{state.replace("_", " ")}</dd>
                </div>
                <div>
                  <dt className="text-ink2">Since</dt>
                  <dd className="font-semibold">{m.starts_on ? shortDate(m.starts_on) : "–"}</dd>
                </div>
                <div>
                  <dt className="text-ink2">Valid until</dt>
                  <dd className="font-semibold">{m.ends_on ? shortDate(m.ends_on) : "No end date"}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-ghost !min-h-10" onClick={() => go("overview")}>
                  Manage membership
                </button>
                <button type="button" className="btn btn-ghost !min-h-10" onClick={() => go("certificates")}>
                  ID and certificates
                </button>
              </div>
            </section>
          )}

          <section className="card grid gap-2 p-5">
            <h3 className="font-semibold">Share your knowledge</h3>
            <p className="text-sm text-ink2">Host a webinar, lecture or workshop for GRAAS members. GRAAS approves hosts and publishes their sessions.</p>
            <button type="button" className="btn btn-primary !min-h-10 justify-self-start" onClick={() => go("host")}>
              Host a session
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
