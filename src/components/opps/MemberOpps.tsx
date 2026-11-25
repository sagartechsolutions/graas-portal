"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import { browserClient } from "@/lib/browser";
import { shortDate } from "@/lib/money";
import { APP_STATUS, KINDS, MODE_LABEL, OppBody, OppCard, OrgLogo } from "./OppBits";

/* Opportunities for members: matched feed, saved posts, applications and invitations. */

export function Modal({ onClose, children, wide = false }: { onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-ink/40 backdrop-blur-[2px]" role="dialog" aria-modal="true" onClick={onClose}>
      <div className={`h-full w-full overflow-y-auto bg-white shadow-2xl ${wide ? "max-w-4xl" : "max-w-2xl"}`} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex justify-end bg-white/90 p-3 backdrop-blur">
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-xl" aria-label="Close">
            ×
          </button>
        </div>
        <div className="px-6 pb-10 sm:px-8">{children}</div>
      </div>
    </div>
  );
}

function ApplyForm({ o, school, onDone }: { o: any; school: boolean; onDone: (msg: string) => void }) {
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    setErr("");
    const { data, error } = await browserClient().rpc("member_apply_opportunity", { p_opp: o.id, p_note: note, p_consent: school ? false : consent });
    setBusy(false);
    if (error || !data?.ok) return setErr(data?.error ?? "Could not send the application.");
    onDone(`Applied to ${o.org_name}. You can follow it under My applications.`);
  }
  return (
    <div className="grid gap-4 rounded-2xl border-2 border-ink p-5">
      <h3 className="h-card">Apply with your GRAAS profile</h3>
      <p className="text-sm text-ink2">{o.org_name} sees your career profile and resume details. {school ? "Your contact details are never shared; GRAAS will put you in touch." : "Your mobile number and email stay hidden until they accept you."}</p>
      <label className="grid gap-1.5 font-medium">
        A short note to {o.org_name}
        <textarea className="field min-h-28" maxLength={1500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={o.apply_note ?? "Why this fits you, and one thing you have built or done."} />
      </label>
      {!school && (
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[#067a2e]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>If {o.org_name} accepts my application, they may see my mobile number and email, and I see theirs.</span>
        </label>
      )}
      {err && <p className="rounded-xl bg-[#fff1ef] px-4 py-3 text-sm font-medium text-[#8f1a11]">{err}</p>}
      <button type="button" className="btn btn-primary justify-self-start" disabled={busy} onClick={send}>
        {busy ? "Sending…" : "Send application"}
      </button>
    </div>
  );
}

export default function MemberOpps({ a, goProfile }: { a: any; goProfile: () => void }) {
  const [feed, setFeed] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [view, setView] = useState<"feed" | "saved" | "apps">("feed");
  const [open, setOpen] = useState<any>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [mode, setMode] = useState("");
  const [flash, setFlash] = useState("");
  const school = a.membership?.plan?.code === "school-student";

  const load = useCallback(async () => {
    const sb = browserClient();
    const [f, m] = await Promise.all([sb.rpc("member_opportunities"), sb.rpc("my_applications")]);
    setFeed(f.data ?? { items: [] });
    setApps((m.data as any[]) ?? []);
  }, []);
  useEffect(() => {
    load();
    const ref = new URLSearchParams(window.location.search).get("opp");
    if (ref) Promise.resolve().then(() => setView("feed"));
  }, [load]);
  // Opening a link like /account?tab=opportunities&opp=GRAAS-OPP-00001 shows that post.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("opp");
    if (ref && feed?.items) {
      const o = feed.items.find((x: any) => x.ref.toLowerCase() === ref.toLowerCase());
      if (o) Promise.resolve().then(() => setOpen(o));
    }
  }, [feed]);

  const items: any[] = useMemo(() => feed?.items ?? [], [feed]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items
      .filter((o) => (view === "saved" ? o.saved : true))
      .filter((o) => !kind || o.kind === kind)
      .filter((o) => !mode || o.work_mode === mode)
      .filter((o) => !s || [o.title, o.org_name, o.location, ...(o.skills ?? [])].join(" ").toLowerCase().includes(s));
  }, [items, view, kind, mode, q]);
  const invites = apps.filter((x) => x.status === "invited").length;

  async function toggleSave(o: any) {
    await browserClient().rpc("member_save_opportunity", { p_opp: o.id, p_on: !o.saved });
    setFeed((f: any) => ({ ...f, items: f.items.map((x: any) => (x.id === o.id ? { ...x, saved: !o.saved } : x)) }));
  }
  async function act(id: string, action: string) {
    const { data } = await browserClient().rpc("member_application_action", { p_id: id, p_action: action });
    setFlash(data?.ok ? (action === "accept" ? "Invitation accepted. You can now see each other's contact details." : action === "decline" ? "Invitation declined." : "Application withdrawn.") : data?.error ?? "Could not do that.");
    load();
  }

  if (!feed) return <div className="card p-8 text-ink2">Loading opportunities…</div>;
  if (!feed.audience)
    return (
      <div className="card p-8">
        <h2 className="h-card !text-2xl">Opportunities</h2>
        <p className="mt-2 text-ink2">Jobs, internships, projects and challenges from GRAAS member companies open up once your membership is active.</p>
      </div>
    );

  const strengthLow = !a.profile.photo_updated_at;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="h-card !text-2xl">Opportunities</h2>
          <p className="text-ink2">{school ? "Challenges, trainings and projects for school students." : "Jobs, internships, projects, problem statements and challenges from GRAAS member companies and institutions. Best matches for your skills come first."}</p>
        </div>
        <div className="inline-flex rounded-full bg-white p-1 shadow-[var(--shadow-card)]">
          {(
            [
              ["feed", `For you (${items.length})`],
              ["saved", `Saved (${items.filter((o) => o.saved).length})`],
              ["apps", `My applications${invites ? ` · ${invites} new` : ` (${apps.length})`}`],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setView(k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === k ? "bg-ink text-white" : "text-ink2"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {flash && <p className="rounded-xl bg-go-soft px-4 py-3 font-medium text-go-deep">{flash}</p>}
      {strengthLow && view !== "apps" && (
        <p className="rounded-xl bg-[#fff6e5] px-4 py-3 text-sm text-[#7a4b00]">
          Companies see your career profile when you apply. Add your photo, skills and a project first.{" "}
          <button type="button" className="font-semibold underline" onClick={goProfile}>
            Complete my profile
          </button>
        </p>
      )}

      {view !== "apps" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <input className="field" placeholder="Search by title, company, skill or place" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="field" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type">
              <option value="">All types</option>
              {KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
            <select className="field" value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Work mode">
              <option value="">Any place</option>
              {Object.entries(MODE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          {shown.length === 0 ? (
            <div className="card p-8 text-center text-ink2">{view === "saved" ? "Nothing saved yet. Use the bookmark on any opportunity." : "No open opportunities match right now. New ones arrive every week; GRAAS emails you when a company invites you."}</div>
          ) : (
            <ul className="grid gap-3 xl:grid-cols-2">
              {shown.map((o) => (
                <li key={o.id}>
                  <OppCard
                    o={o}
                    onOpen={() => setOpen(o)}
                    badge={
                      <>
                        {o.score >= 10 && <span className="rounded-full bg-go-soft px-2.5 py-0.5 text-xs font-semibold text-go-deep">Good match</span>}
                        {o.applied && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${APP_STATUS[o.applied]?.tone}`}>{APP_STATUS[o.applied]?.label}</span>}
                      </>
                    }
                    aside={
                      <button type="button" onClick={() => toggleSave(o)} aria-pressed={o.saved} aria-label={o.saved ? "Remove from saved" : "Save"} className={`flex h-9 w-9 items-center justify-center rounded-full border ${o.saved ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
                        <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true">
                          <path d="M2 1.5h10v13L7 11l-5 3.5z" fill={o.saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        </svg>
                      </button>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : apps.length === 0 ? (
        <div className="card p-8 text-center text-ink2">You have not applied yet. Open an opportunity under For you and apply with your GRAAS profile.</div>
      ) : (
        <ul className="grid gap-3">
          {apps.map((x) => (
            <li key={x.id} className="card grid gap-4 p-5">
              <div className="flex flex-wrap items-start gap-4">
                <OrgLogo org={x.opportunity.org} name={x.opportunity.org_name} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${APP_STATUS[x.status]?.tone}`}>{APP_STATUS[x.status]?.label}</span>
                    {x.connected && <span className="rounded-full bg-go px-2.5 py-0.5 text-xs font-semibold text-white">Connected</span>}
                    <span className="text-xs text-ink2">{x.source === "invited" ? "Invited" : "Applied"} {shortDate(x.created_at)}</span>
                  </p>
                  <button type="button" className="mt-1 text-left text-lg font-semibold hover:underline" onClick={() => setOpen(x.opportunity)}>
                    {x.opportunity.title}
                  </button>
                  <p className="text-ink2">{x.opportunity.org_name}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {x.status === "invited" && (
                    <>
                      <button type="button" className="btn btn-primary !min-h-10" onClick={() => act(x.id, "accept")}>
                        Accept
                      </button>
                      <button type="button" className="btn btn-ghost !min-h-10" onClick={() => act(x.id, "decline")}>
                        Decline
                      </button>
                    </>
                  )}
                  {["applied", "shortlisted", "interview"].includes(x.status) && (
                    <button type="button" className="btn btn-ghost !min-h-10" onClick={() => confirm("Withdraw this application?") && act(x.id, "withdraw")}>
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
              {x.status === "invited" && (
                <p className="rounded-xl bg-[#eef4ff] px-4 py-3 text-sm text-[#1d3a8a]">
                  {x.opportunity.org_name} found your profile among the best matches and invites you to this {x.opportunity.kind_label.toLowerCase()}.
                  {x.invite_message ? ` “${x.invite_message}”` : ""} If you accept, you both see each other&apos;s contact details.
                </p>
              )}
              {x.connected && x.contact && (
                <div className="rounded-xl bg-go-soft px-4 py-3 text-sm">
                  <b className="font-semibold text-go-deep">Contact at {x.opportunity.org_name}:</b> {x.contact.name}
                  {x.contact.designation ? `, ${x.contact.designation}` : ""}
                  {x.contact.email && (
                    <>
                      {" · "}
                      <a className="font-semibold underline" href={`mailto:${x.contact.email}`}>
                        {x.contact.email}
                      </a>
                    </>
                  )}
                  {x.contact.phone && (
                    <>
                      {" · "}
                      <a className="font-semibold underline" href={`tel:+91${x.contact.phone}`}>
                        +91 {x.contact.phone}
                      </a>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <Modal onClose={() => setOpen(null)}>
          <div className="flex items-start gap-4">
            <OrgLogo org={open.org} name={open.org_name} size={64} />
            <div>
              <p className="text-sm font-semibold text-go-deep">{open.kind_label}</p>
              <h2 className="text-2xl font-semibold tracking-tight">{open.title}</h2>
              <p className="text-ink2">{open.org_name}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-6">
            {(() => {
              const mine = apps.find((x) => x.opportunity.id === open.id);
              const st = mine?.status ?? items.find((x) => x.id === open.id)?.applied;
              if (st === "invited" && mine)
                return (
                  <div className="grid gap-3 rounded-2xl bg-[#eef4ff] p-5 text-[#1d3a8a]">
                    <p className="font-semibold">{open.org_name} invites you to this {String(open.kind_label).toLowerCase()}.</p>
                    {mine.invite_message && <p>“{mine.invite_message}”</p>}
                    <p className="text-sm">If you accept, you both see each other&apos;s contact details.</p>
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-primary !min-h-10" onClick={() => { setOpen(null); act(mine.id, "accept"); }}>
                        Accept
                      </button>
                      <button type="button" className="btn btn-ghost !min-h-10" onClick={() => { setOpen(null); act(mine.id, "decline"); }}>
                        Decline
                      </button>
                    </div>
                  </div>
                );
              if (st && st !== "withdrawn") return <p className={`rounded-xl px-4 py-3 font-semibold ${APP_STATUS[st]?.tone}`}>Your application: {APP_STATUS[st]?.label}</p>;
              if (!open.open) return <p className="rounded-xl bg-mist px-4 py-3 font-semibold">This opportunity is closed.</p>;
              return (
                <ApplyForm
                  o={open}
                  school={school}
                  onDone={(msg) => {
                    setOpen(null);
                    setFlash(msg);
                    setView("apps");
                    load();
                  }}
                />
              );
            })()}
            <OppBody o={open} />
          </div>
        </Modal>
      )}
    </div>
  );
}
