"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/browser";
import { shortDate } from "@/lib/money";
import { initials, usePhoto } from "./Details";
import { courseLine, period } from "./ProfileView";

/* Resume builder: fills itself from the career profile and account details, in two designs, on one A4 page.
   The text shrinks a little (never below 80%) to keep the resume on one page; if it still does not fit,
   the member is told which sections to shorten. Printing gives a real A4 PDF. */

const r = (mm: number) => `${((mm * 100) / 210).toFixed(3)}cqw`;
type Tpl = "classic" | "modern";

function useFit(deps: unknown[]) {
  const sheet = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [over, setOver] = useState(false);
  useLayoutEffect(() => {
    let s = 1;
    const fits = () => !!sheet.current && !!body.current && body.current.scrollHeight <= sheet.current.clientHeight + 1;
    if (!sheet.current || !body.current) return;
    body.current.style.setProperty("--rs", "1");
    while (!fits() && s > 0.8) {
      s = Math.round((s - 0.03) * 100) / 100;
      body.current.style.setProperty("--rs", String(s));
    }
    setScale(s);
    setOver(!fits());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { sheet, body, scale, over };
}

const fs = (mm: number) => `calc(var(--rs, 1) * ${r(mm)})`;

function H({ children, tone = "classic" }: { children: React.ReactNode; tone?: Tpl }) {
  return (
    <h3
      className="font-semibold uppercase"
      style={{ fontSize: fs(2.9), letterSpacing: "0.14em", color: tone === "modern" ? "#067a2e" : "#000e21", borderBottom: tone === "classic" ? `${r(0.3)} solid #000e21` : undefined, paddingBottom: r(0.8), marginBottom: fs(1.8) }}
    >
      {children}
    </h3>
  );
}

function Items({ list, kind }: { list: any[]; kind: string }) {
  return (
    <div style={{ display: "grid", gap: fs(2.2) }}>
      {list.map((x, i) => {
        const head = kind === "experience" ? [x.title, x.org].filter(Boolean).join(", ") : kind === "education" ? x.course : kind === "projects" ? x.title : kind === "achievements" ? x.title : x.name;
        const meta =
          kind === "experience"
            ? [x.kind, x.place].filter(Boolean).join(", ")
            : kind === "education"
              ? [x.institute, x.board, x.score].filter(Boolean).join(", ")
              : kind === "projects"
                ? [x.role, x.tools].filter(Boolean).join(" · ")
                : kind === "certifications"
                  ? x.issuer
                  : "";
        const when = kind === "experience" ? period(x.from, x.to, x.current) : kind === "education" ? period(x.from, x.to) : x.year;
        const text = x.summary ?? x.detail;
        return (
          <div key={i}>
            <div className="flex items-baseline justify-between" style={{ gap: r(3) }}>
              <p className="font-semibold" style={{ fontSize: fs(3.35) }}>
                {head}
              </p>
              {when && (
                <p className="shrink-0 text-[#4a515c]" style={{ fontSize: fs(2.8) }}>
                  {when}
                </p>
              )}
            </div>
            {meta && (
              <p className="text-[#4a515c]" style={{ fontSize: fs(2.9) }}>
                {meta}
              </p>
            )}
            {text && (
              <p className="whitespace-pre-line" style={{ fontSize: fs(3), lineHeight: 1.45, marginTop: fs(0.6) }}>
                {text}
              </p>
            )}
            {kind === "projects" && x.link && (
              <p className="text-[#067a2e]" style={{ fontSize: fs(2.7) }}>
                {String(x.link).replace(/^https?:\/\//, "")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Resume({ a }: { a: any }) {
  const [mp, setMp] = useState<any>(null);
  const [tpl, setTpl] = useState<Tpl>("modern");
  const [showPhoto, setShowPhoto] = useState(true);
  const p = a.profile, m = a.membership;
  const photo = usePhoto(p.id, p.photo_updated_at);
  useEffect(() => {
    browserClient()
      .rpc("my_profile")
      .then(({ data }) => setMp(data ?? {}));
  }, []);
  const fit = useFit([mp, tpl, showPhoto, photo]);
  if (!mp) return <div className="card p-8 text-ink2">Loading your resume…</div>;

  const links = Object.entries(mp.links ?? {}) as [string, string][];
  const edu = (mp.education ?? []).length ? mp.education : courseLine(p) || p.organisation ? [{ course: courseLine(p) || p.organisation, institute: courseLine(p) ? p.organisation : "" }] : [];
  const graas: any[] = [];
  if (m?.member_no && m.status === "active") {
    const typeName = m.plan?.code === "school-student" ? "School Student" : m.plan?.name;
    graas.push({ name: `GRAAS ${typeName} Member, ${m.member_no}`, issuer: "Global Robotics And Automation Society", year: m.starts_on ? shortDate(m.starts_on) : "" });
    if (p.pledged_at) graas.push({ name: "GRAAS Member Pledge", issuer: "Global Robotics And Automation Society", year: shortDate(String(p.pledged_at).slice(0, 10)) });
  }
  const certs = [...graas, ...(mp.certifications ?? [])];
  const contact = [p.email, p.phone ? `+91 ${p.phone}` : null, [p.city, p.state].filter(Boolean).join(", ") || null].filter(Boolean) as string[];
  const headline = mp.headline || [p.designation, courseLine(p)].filter(Boolean).join(" · ");
  const sections: [string, string, any[]][] = [
    ["Experience", "experience", mp.experience ?? []],
    ["Projects", "projects", mp.projects ?? []],
    ["Education", "education", edu],
    ["Achievements", "achievements", mp.achievements ?? []],
    ["Certifications", "certifications", certs],
  ];
  const empty = !(mp.about || (mp.skills ?? []).length || (mp.projects ?? []).length || (mp.experience ?? []).length);

  const skills = (mp.skills ?? []).length > 0 && (
    <section>
      <H tone={tpl}>Skills</H>
      {tpl === "modern" ? (
        <ul style={{ display: "grid", gap: fs(1.2) }}>
          {(mp.skills as string[]).map((s) => (
            <li key={s} style={{ fontSize: fs(3) }}>
              {s}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: fs(3.05), lineHeight: 1.5 }}>{(mp.skills as string[]).join(" · ")}</p>
      )}
    </section>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="grid content-start gap-4 print:hidden xl:sticky xl:top-24 xl:self-start">
        <div className="card grid gap-4 p-5">
          <div>
            <h2 className="h-card">Resume</h2>
            <p className="text-sm text-ink2">Built from your career profile. Change the profile and the resume follows.</p>
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold">Design</legend>
            {(["modern", "classic"] as Tpl[]).map((t) => (
              <label key={t} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 ${tpl === t ? "border-ink bg-mist" : "border-line"}`}>
                <input type="radio" name="tpl" className="accent-[#067a2e]" checked={tpl === t} onChange={() => setTpl(t)} />
                <span>
                  <b className="font-semibold">{t === "modern" ? "Modern" : "Classic"}</b>
                  <span className="block text-sm text-ink2">{t === "modern" ? "Navy side panel with photo and skills" : "Single column, formal, prints in black"}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {tpl === "modern" && (
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 accent-[#067a2e]" checked={showPhoto} onChange={(e) => setShowPhoto(e.target.checked)} />
              Show my photo
            </label>
          )}
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            Download PDF
          </button>
          <p className="text-xs text-ink2">In the print window choose “Save as PDF”, paper A4, margins none.</p>
        </div>
        {(empty || fit.over || fit.scale < 1) && (
          <div className={`rounded-2xl px-4 py-3 text-sm ${fit.over || empty ? "bg-[#fff6e5] text-[#7a4b00]" : "bg-go-soft text-go-deep"}`}>
            {empty
              ? "Your resume is nearly empty. Add a summary, skills and a project in Career profile first."
              : fit.over
                ? "Your resume is longer than one page. Shorten some descriptions or remove older items in Career profile."
                : `Text set at ${Math.round(fit.scale * 100)}% so everything fits on one page.`}
          </div>
        )}
      </aside>

      <div className="overflow-x-auto pb-2">
        <style>{"@media print { @page { size: A4 portrait; margin: 0; } }"}</style>
        <div className="print-area print-cert-p mx-auto min-w-[560px] max-w-[860px]">
          <div style={{ containerType: "inline-size" }}>
            <div ref={fit.sheet} className="cert-sheet relative aspect-[210/297] w-full overflow-hidden bg-white text-ink shadow-[var(--shadow-card)] ring-1 ring-line">
              {tpl === "modern" ? (
                <div ref={fit.body} className="grid h-full" style={{ gridTemplateColumns: `${r(66)} 1fr` }}>
                  <div className="bg-ink text-white" style={{ padding: `${r(14)} ${r(8)}`, display: "grid", alignContent: "start", gap: fs(6) }}>
                    {showPhoto && (
                      <div className="overflow-hidden rounded-full bg-white/10" style={{ width: r(36), height: r(36), border: `${r(1)} solid rgba(255,255,255,.25)` }}>
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center font-semibold" style={{ fontSize: r(11) }}>
                            {initials(p.full_name ?? "")}
                          </span>
                        )}
                      </div>
                    )}
                    <section style={{ display: "grid", gap: fs(1.4) }}>
                      <h3 className="font-semibold uppercase text-[#7fe0a0]" style={{ fontSize: fs(2.7), letterSpacing: "0.14em" }}>
                        Contact
                      </h3>
                      {contact.map((c) => (
                        <p key={c} style={{ fontSize: fs(2.85), overflowWrap: "anywhere" }}>
                          {c}
                        </p>
                      ))}
                      {links.map(([k, v]) => (
                        <p key={k} style={{ fontSize: fs(2.6), overflowWrap: "anywhere" }} className="text-white/80">
                          {v.replace(/^https?:\/\/(www\.)?/, "")}
                        </p>
                      ))}
                    </section>
                    {(mp.skills ?? []).length > 0 && (
                      <section style={{ display: "grid", gap: fs(1.2) }}>
                        <h3 className="font-semibold uppercase text-[#7fe0a0]" style={{ fontSize: fs(2.7), letterSpacing: "0.14em" }}>
                          Skills
                        </h3>
                        {(mp.skills as string[]).map((s) => (
                          <p key={s} style={{ fontSize: fs(2.95) }}>
                            {s}
                          </p>
                        ))}
                      </section>
                    )}
                    {(mp.languages ?? []).length > 0 && (
                      <section style={{ display: "grid", gap: fs(1.2) }}>
                        <h3 className="font-semibold uppercase text-[#7fe0a0]" style={{ fontSize: fs(2.7), letterSpacing: "0.14em" }}>
                          Languages
                        </h3>
                        <p style={{ fontSize: fs(2.95) }}>{(mp.languages as string[]).join(", ")}</p>
                      </section>
                    )}
                    {m?.member_no && m.status === "active" && (
                      <section style={{ display: "grid", gap: fs(0.8) }}>
                        <h3 className="font-semibold uppercase text-[#7fe0a0]" style={{ fontSize: fs(2.7), letterSpacing: "0.14em" }}>
                          GRAAS member
                        </h3>
                        <p className="readout" style={{ fontSize: fs(2.8) }}>
                          {m.member_no}
                        </p>
                        <p className="text-white/70" style={{ fontSize: fs(2.5) }}>
                          Verify at graas.org.in/verify
                        </p>
                      </section>
                    )}
                  </div>
                  <div style={{ padding: `${r(15)} ${r(13)} ${r(12)} ${r(11)}`, display: "grid", alignContent: "start", gap: fs(5.5) }}>
                    <header>
                      <h1 className="font-semibold tracking-tight" style={{ fontSize: fs(9.5), lineHeight: 1.05 }}>
                        {p.full_name}
                      </h1>
                      {headline && (
                        <p className="font-medium text-[#067a2e]" style={{ fontSize: fs(3.6), marginTop: fs(1.6) }}>
                          {headline}
                        </p>
                      )}
                      {mp.about && (
                        <p className="whitespace-pre-line text-[#2b3340]" style={{ fontSize: fs(3.05), lineHeight: 1.5, marginTop: fs(3) }}>
                          {mp.about}
                        </p>
                      )}
                    </header>
                    {sections
                      .filter(([, , l]) => l.length)
                      .map(([t, k, l]) => (
                        <section key={k}>
                          <H tone="modern">{t}</H>
                          <Items list={l} kind={k} />
                        </section>
                      ))}
                  </div>
                </div>
              ) : (
                <div ref={fit.body} style={{ padding: `${r(16)} ${r(18)}`, display: "grid", alignContent: "start", gap: fs(5) }}>
                  <header className="text-center">
                    <h1 className="font-semibold tracking-tight" style={{ fontSize: fs(9), lineHeight: 1.05, fontFamily: '"IBM Plex Serif", Georgia, serif' }}>
                      {p.full_name}
                    </h1>
                    {headline && (
                      <p className="font-medium" style={{ fontSize: fs(3.5), marginTop: fs(1.4) }}>
                        {headline}
                      </p>
                    )}
                    <p className="text-[#4a515c]" style={{ fontSize: fs(2.9), marginTop: fs(1.4) }}>
                      {[...contact, ...links.map(([, v]) => v.replace(/^https?:\/\/(www\.)?/, ""))].join("  ·  ")}
                    </p>
                  </header>
                  {mp.about && (
                    <section>
                      <H>Summary</H>
                      <p className="whitespace-pre-line" style={{ fontSize: fs(3.05), lineHeight: 1.5 }}>
                        {mp.about}
                      </p>
                    </section>
                  )}
                  {skills}
                  {sections
                    .filter(([, , l]) => l.length)
                    .map(([t, k, l]) => (
                      <section key={k}>
                        <H>{t}</H>
                        <Items list={l} kind={k} />
                      </section>
                    ))}
                  {(mp.languages ?? []).length > 0 && (
                    <section>
                      <H>Languages</H>
                      <p style={{ fontSize: fs(3.05) }}>{(mp.languages as string[]).join(", ")}</p>
                    </section>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
