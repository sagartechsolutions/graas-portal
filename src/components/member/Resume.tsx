"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { phoneText } from "@/lib/format";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LogoMark } from "@/components/site/Logo";
import { browserClient } from "@/lib/browser";
import { shortDate } from "@/lib/money";
import { initials, usePhoto } from "./Details";
import { courseLine, period } from "./ProfileView";
import Qr from "./Qr";

/* Resume builder. It fills itself from the career profile, the account and GRAAS records, in six designs.
   Long resumes flow onto a second, third... A4 page instead of being squeezed: every block (a section title,
   a job, a project) is measured, and a page breaks before a block that would not fit. A section title never
   sits alone at the bottom of a page. The member can still ask for one page; the text then shrinks a little
   (never below 85%) before a second page is added.
   Everything is sized in units of the page width, so the preview and the printed A4 page break in the same
   places. Printing sends only the pages (one per sheet) to the printer. */

export type Tpl = "modern" | "classic" | "executive" | "compact" | "creative" | "technical";
export type ResumePrefs = { template: Tpl; show_photo: boolean; show_qr: boolean; show_brand: boolean; one_page: boolean; accent: string; hide: string[]; skills: string[] };
export const DEFAULT_PREFS: ResumePrefs = { template: "modern", show_photo: true, show_qr: true, show_brand: true, one_page: false, accent: "navy", hide: [], skills: [] };
/* At most this many skills go on a resume, so the side panel (and its QR code) always fits. */
export const RESUME_SKILLS = 12;

export const TEMPLATES: { id: Tpl; name: string; hint: string }[] = [
  { id: "modern", name: "Modern", hint: "Side panel with photo, contact and skills" },
  { id: "classic", name: "Classic", hint: "Formal single column, prints well in black" },
  { id: "executive", name: "Executive", hint: "Bold header band, for experienced people" },
  { id: "compact", name: "Compact", hint: "Fits more on each page" },
  { id: "creative", name: "Creative", hint: "Accent bar, skill chips and a timeline" },
  { id: "technical", name: "Technical", hint: "Projects first, tools as tags" },
];
export const ACCENTS: Record<string, { name: string; c: string; soft: string }> = {
  navy: { name: "Navy", c: "#000e21", soft: "#e9ecf2" },
  green: { name: "Green", c: "#067a2e", soft: "#e7f6ec" },
  slate: { name: "Slate", c: "#3b4350", soft: "#eef0f3" },
  teal: { name: "Teal", c: "#0f6e78", soft: "#e4f3f4" },
  maroon: { name: "Maroon", c: "#7a1f2b", soft: "#f6e9eb" },
  indigo: { name: "Indigo", c: "#2c3e8f", soft: "#eaedf8" },
};
const SECTIONS: [string, string][] = [
  ["about", "Summary"],
  ["skills", "Skills"],
  ["experience", "Experience"],
  ["projects", "Projects"],
  ["education", "Education"],
  ["achievements", "Achievements"],
  ["certifications", "Certifications"],
  ["documents", "Certificates verified by GRAAS"],
  ["languages", "Languages"],
  ["links", "Links"],
  ["graas", "GRAAS membership"],
];

/* Sizes: n millimetres on an A4 page (210 mm wide), relative to the page width. */
const mm = (n: number) => `${((n * 100) / 210).toFixed(3)}cqw`;
const f = (n: number) => `calc(var(--rs, 1) * ${mm(n)})`;
const PAGE_H = 297;
const MUTED = "#4a515c";
const SERIF = '"IBM Plex Serif", Georgia, serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

/* Page geometry per design, in millimetres. */
const GEO: Record<Tpl, { top: number; bottom: number; x: number; side?: number; gap: number; scale?: number }> = {
  modern: { top: 14, bottom: 14, x: 11, side: 64, gap: 4.6 },
  classic: { top: 16, bottom: 15, x: 18, gap: 4.4 },
  executive: { top: 10, bottom: 14, x: 15, gap: 4.6 },
  compact: { top: 12, bottom: 12, x: 13, gap: 3, scale: 0.9 },
  creative: { top: 14, bottom: 14, x: 15, gap: 4.6 },
  technical: { top: 14, bottom: 14, x: 15, gap: 4.2 },
};

type Block = { key: string; node: React.ReactNode; keepNext?: boolean };

const clean = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

function Title({ tpl, accent, children }: { tpl: Tpl; accent: string; children: React.ReactNode }) {
  const base = { fontSize: f(tpl === "compact" ? 2.6 : 2.85), letterSpacing: "0.13em" } as React.CSSProperties;
  if (tpl === "classic")
    return (
      <h3 className="font-semibold uppercase" style={{ ...base, color: "#000e21", borderBottom: `${mm(0.3)} solid #000e21`, paddingBottom: mm(0.8) }}>
        {children}
      </h3>
    );
  if (tpl === "executive")
    return (
      <h3 className="font-semibold uppercase" style={{ ...base, color: accent, borderLeft: `${mm(1.3)} solid ${accent}`, paddingLeft: mm(2.4), lineHeight: 1.6 }}>
        {children}
      </h3>
    );
  if (tpl === "creative")
    return (
      <h3 className="flex items-center font-semibold" style={{ fontSize: f(3.6), color: "#000e21", gap: mm(2) }}>
        <span style={{ width: mm(2.6), height: mm(2.6), borderRadius: 999, background: accent }} aria-hidden="true" />
        {children}
      </h3>
    );
  if (tpl === "technical")
    return (
      <h3 className="font-semibold" style={{ fontSize: f(3.2), color: accent, fontFamily: MONO }}>
        {"// "}
        {children}
      </h3>
    );
  return (
    <h3 className="font-semibold uppercase" style={{ ...base, color: accent, borderBottom: `${mm(0.25)} solid #d9dce2`, paddingBottom: mm(0.9) }}>
      {children}
    </h3>
  );
}

function Item({ x, kind, tpl, accent }: { x: any; kind: string; tpl: Tpl; accent: string }) {
  const head = kind === "experience" ? [x.title, x.org].filter(Boolean).join(", ") : kind === "education" ? x.course : kind === "certifications" || kind === "documents" ? x.name : x.title;
  const meta =
    kind === "experience"
      ? [x.kind, x.place].filter(Boolean).join(", ")
      : kind === "education"
        ? [x.institute, x.board, x.score].filter(Boolean).join(", ")
        : kind === "projects"
          ? [x.role, tpl === "technical" ? "" : x.tools].filter(Boolean).join(" · ")
          : kind === "certifications" || kind === "documents"
            ? x.issuer
            : "";
  const when = kind === "experience" ? period(x.from, x.to, x.current) : kind === "education" ? period(x.from, x.to) : x.year;
  const text = x.summary ?? x.detail;
  const timeline = tpl === "creative" && (kind === "experience" || kind === "education");
  const small = tpl === "compact";
  return (
    <div style={timeline ? { borderLeft: `${mm(0.5)} solid ${accent}33`, paddingLeft: mm(4), position: "relative" } : undefined}>
      {timeline && <span style={{ position: "absolute", left: mm(-1.45), top: mm(1.2), width: mm(2.4), height: mm(2.4), borderRadius: 999, background: accent }} aria-hidden="true" />}
      <div className="flex items-baseline justify-between" style={{ gap: mm(3) }}>
        <p className="font-semibold" style={{ fontSize: f(small ? 3.05 : 3.35) }}>
          {head}
          {x.verified && (
            <span className="font-semibold" style={{ color: "#067a2e", fontSize: f(2.5), marginLeft: mm(1.5) }}>
              ✓ Verified by GRAAS
            </span>
          )}
        </p>
        {when && (
          <p className="shrink-0" style={{ fontSize: f(small ? 2.6 : 2.8), color: MUTED, fontFamily: tpl === "technical" ? MONO : undefined }}>
            {when}
          </p>
        )}
      </div>
      {meta && <p style={{ fontSize: f(small ? 2.7 : 2.9), color: MUTED }}>{meta}</p>}
      {text && (
        <p className="whitespace-pre-line" style={{ fontSize: f(small ? 2.8 : 3), lineHeight: small ? 1.38 : 1.45, marginTop: f(0.6) }}>
          {text}
        </p>
      )}
      {kind === "projects" && tpl === "technical" && x.tools && (
        <p className="flex flex-wrap" style={{ gap: mm(1.2), marginTop: f(1) }}>
          {String(x.tools)
            .split(/[,;·]+/)
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => (
              <span key={t} style={{ fontSize: f(2.45), fontFamily: MONO, background: `${accent}14`, color: accent, borderRadius: mm(0.8), padding: `${mm(0.3)} ${mm(1.4)}` }}>
                {t}
              </span>
            ))}
        </p>
      )}
      {kind === "projects" && x.link && <p style={{ fontSize: f(2.7), color: accent }}>{clean(String(x.link))}</p>}
    </div>
  );
}

function Chips({ list, accent, tpl }: { list: string[]; accent: string; tpl: Tpl }) {
  if (tpl === "classic" || tpl === "compact") return <p style={{ fontSize: f(tpl === "compact" ? 2.85 : 3.05), lineHeight: 1.5 }}>{list.join(" · ")}</p>;
  return (
    <p className="flex flex-wrap" style={{ gap: mm(1.4) }}>
      {list.map((s) => (
        <span
          key={s}
          style={{
            fontSize: f(2.75),
            fontFamily: tpl === "technical" ? MONO : undefined,
            borderRadius: tpl === "technical" ? mm(0.8) : 999,
            padding: `${mm(0.5)} ${mm(2.2)}`,
            background: tpl === "creative" ? accent : `${accent}12`,
            color: tpl === "creative" ? "#fff" : accent,
            fontWeight: 500,
          }}
        >
          {s}
        </span>
      ))}
    </p>
  );
}

function Avatar({ photo, name, size, round = true, ring }: { photo: string | null; name: string; size: number; round?: boolean; ring?: string }) {
  return (
    <div className="shrink-0 overflow-hidden bg-[#eef0f3]" style={{ width: mm(size), height: mm(size), borderRadius: round ? 999 : mm(2.5), border: ring ? `${mm(0.9)} solid ${ring}` : undefined }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-semibold text-[#5a616b]" style={{ fontSize: mm(size * 0.32) }}>
          {initials(name)}
        </span>
      )}
    </div>
  );
}

/* The member's chosen resume skills that are still in the profile, in profile order; otherwise the first 12. */
export function pickSkills(all: string[], chosen: string[] | undefined) {
  const set = new Set((chosen ?? []).map((x) => x.toLowerCase()));
  const picked = set.size ? all.filter((x) => set.has(x.toLowerCase())) : all;
  return picked.slice(0, RESUME_SKILLS);
}

/* Everything the resume needs, worked out once from the profile. */
function useContent(a: any, mp: any, docs: any[], prefs: ResumePrefs) {
  return useMemo(() => {
    if (!mp) return null;
    const p = a.profile,
      m = a.membership;
    const active = !!m?.member_no && m.status === "active";
    const links = Object.entries(mp.links ?? {}).filter(([, v]) => v) as [string, string][];
    const edu = (mp.education ?? []).length ? mp.education : courseLine(p) || p.organisation ? [{ course: courseLine(p) || p.organisation, institute: courseLine(p) ? p.organisation : "" }] : [];
    const graas: any[] = [];
    if (active) {
      const typeName = m.plan?.code === "school-student" ? "School Student" : m.plan?.name;
      graas.push({ name: `${typeName} Member, ${m.member_no}`, issuer: "Global Robotics And Automation Society", year: m.starts_on ? `Since ${shortDate(m.starts_on)}` : "" });
      if (p.pledged_at) graas.push({ name: "GRAAS Member Pledge", issuer: "Global Robotics And Automation Society", year: shortDate(String(p.pledged_at).slice(0, 10)) });
    }
    const verified = docs.filter((d) => d.kind !== "resume" && d.verify_status === "verified").map((d) => ({ name: d.title, issuer: d.issuer, year: d.issued_on ? shortDate(d.issued_on) : "", verified: true }));
    const contact = [p.email, p.phone ? phoneText(p.phone) : null, [p.city, p.state && p.state !== "Outside India" ? p.state : null].filter(Boolean).join(", ") || null].filter(Boolean) as string[];
    const headline = mp.headline || [p.designation, courseLine(p)].filter(Boolean).join(" · ");
    const hide = new Set(prefs.hide);
    return {
      p,
      m,
      active,
      links: hide.has("links") ? [] : links,
      contact,
      headline,
      name: p.full_name ?? "",
      qr: active && prefs.show_qr ? `https://graas.org.in/m/${m.member_no}` : null,
      about: hide.has("about") ? "" : mp.about ?? "",
      skills: hide.has("skills") ? [] : pickSkills((mp.skills ?? []) as string[], prefs.skills),
      languages: hide.has("languages") ? [] : ((mp.languages ?? []) as string[]),
      lists: {
        experience: hide.has("experience") ? [] : mp.experience ?? [],
        projects: hide.has("projects") ? [] : mp.projects ?? [],
        education: hide.has("education") ? [] : edu,
        achievements: hide.has("achievements") ? [] : mp.achievements ?? [],
        certifications: hide.has("certifications") ? [] : mp.certifications ?? [],
        documents: hide.has("documents") ? [] : verified,
        graas: hide.has("graas") ? [] : graas,
      } as Record<string, any[]>,
      empty: !(mp.about || (mp.skills ?? []).length || (mp.projects ?? []).length || (mp.experience ?? []).length),
    };
  }, [a, mp, docs, prefs]);
}

type C = NonNullable<ReturnType<typeof useContent>>;

/* The blocks that flow from page to page, in the order of the design. */
function blocksFor(c: C, tpl: Tpl, accent: string): Block[] {
  const out: Block[] = [];
  const side = tpl === "modern";
  const order = tpl === "technical" ? ["about", "skills", "languages", "projects", "experience", "education", "achievements", "certifications", "documents", "graas"] : ["about", "skills", "languages", "experience", "projects", "education", "achievements", "certifications", "documents", "graas"];
  const label = (k: string) => (k === "about" ? (tpl === "technical" ? "Profile" : "Summary") : SECTIONS.find(([id]) => id === k)?.[1] ?? k);
  for (const k of order) {
    if (k === "about") {
      if (!c.about || side) continue;
      out.push({ key: "t-about", keepNext: true, node: <Title tpl={tpl} accent={accent}>{label(k)}</Title> });
      out.push({ key: "about", node: <p className="whitespace-pre-line" style={{ fontSize: f(tpl === "compact" ? 2.85 : 3.05), lineHeight: 1.5 }}>{c.about}</p> });
    } else if (k === "skills") {
      if (!c.skills.length || side) continue;
      out.push({ key: "t-skills", keepNext: true, node: <Title tpl={tpl} accent={accent}>{label(k)}</Title> });
      out.push({ key: "skills", node: <Chips list={c.skills} accent={accent} tpl={tpl} /> });
    } else if (k === "languages") {
      if (!c.languages.length || side) continue;
      out.push({ key: "t-lang", keepNext: true, node: <Title tpl={tpl} accent={accent}>{label(k)}</Title> });
      out.push({ key: "lang", node: <p style={{ fontSize: f(3) }}>{c.languages.join(", ")}</p> });
    } else {
      const list = c.lists[k] ?? [];
      if (!list.length || (side && k === "graas")) continue;
      out.push({ key: `t-${k}`, keepNext: true, node: <Title tpl={tpl} accent={accent}>{label(k)}</Title> });
      list.forEach((x, i) => out.push({ key: `${k}-${i}`, node: <Item x={x} kind={k === "graas" ? "certifications" : k} tpl={tpl} accent={accent} /> }));
    }
  }
  return out;
}

function ContactLine({ c, center, color = MUTED }: { c: C; center?: boolean; color?: string }) {
  const items = [...c.contact, ...c.links.map(([, v]) => clean(v))];
  return (
    <p style={{ fontSize: f(2.85), color, marginTop: f(1.4), textAlign: center ? "center" : undefined, lineHeight: 1.5 }}>
      {items.join("  ·  ")}
    </p>
  );
}

function QrTag({ value, size, dark }: { value: string; size: number; dark?: boolean }) {
  return (
    <div className="grid justify-items-center" style={{ gap: mm(0.8) }}>
      <div style={{ background: "#fff", padding: mm(1), borderRadius: mm(1.2) }}>
        <Qr value={value} size={96} style={{ width: mm(size), height: mm(size), display: "block" }} />
      </div>
      <p style={{ fontSize: f(2.1), color: dark ? "rgba(255,255,255,.75)" : MUTED, textAlign: "center", lineHeight: 1.25 }}>Scan to verify</p>
    </div>
  );
}

/* Page 1 header (everything above the flowing blocks). */
function Head({ c, tpl, accent, photo, prefs }: { c: C; tpl: Tpl; accent: string; photo: string | null; prefs: ResumePrefs }) {
  const A = ACCENTS[prefs.accent] ?? ACCENTS.navy;
  if (tpl === "modern")
    return (
      <header>
        <h1 className="font-semibold tracking-tight" style={{ fontSize: f(9.5), lineHeight: 1.05 }}>
          {c.name}
        </h1>
        {c.headline && (
          <p className="font-medium" style={{ fontSize: f(3.6), marginTop: f(1.6), color: accent === "#000e21" ? "#067a2e" : accent }}>
            {c.headline}
          </p>
        )}
        {c.about && (
          <p className="whitespace-pre-line text-[#2b3340]" style={{ fontSize: f(3.05), lineHeight: 1.5, marginTop: f(3) }}>
            {c.about}
          </p>
        )}
      </header>
    );
  if (tpl === "executive")
    return (
      <header className="flex items-center text-white" style={{ background: accent, margin: `-${mm(GEO.executive.top)} -${mm(GEO.executive.x)} 0`, padding: `${mm(11)} ${mm(15)} ${mm(9)}`, gap: mm(6) }}>
        {prefs.show_photo && <Avatar photo={photo} name={c.name} size={30} round={false} ring="rgba(255,255,255,.35)" />}
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold tracking-tight" style={{ fontSize: f(9), lineHeight: 1.05 }}>
            {c.name}
          </h1>
          {c.headline && <p style={{ fontSize: f(3.7), marginTop: f(1.4), color: "rgba(255,255,255,.88)" }}>{c.headline}</p>}
          <ContactLine c={c} color="rgba(255,255,255,.78)" />
        </div>
        {c.qr && <QrTag value={c.qr} size={19} dark />}
      </header>
    );
  if (tpl === "classic")
    return (
      <header className="relative text-center">
        {prefs.show_photo && (
          <div className="absolute left-0 top-0">
            <Avatar photo={photo} name={c.name} size={22} />
          </div>
        )}
        {c.qr && (
          <div className="absolute right-0 top-0">
            <QrTag value={c.qr} size={17} />
          </div>
        )}
        <div style={{ padding: `0 ${mm(prefs.show_photo || c.qr ? 26 : 0)}` }}>
          <h1 className="font-semibold tracking-tight" style={{ fontSize: f(9), lineHeight: 1.05, fontFamily: SERIF }}>
            {c.name}
          </h1>
          {c.headline && (
            <p className="font-medium" style={{ fontSize: f(3.5), marginTop: f(1.4) }}>
              {c.headline}
            </p>
          )}
          <ContactLine c={c} center />
        </div>
      </header>
    );
  if (tpl === "creative")
    return (
      <header className="flex items-center" style={{ gap: mm(6) }}>
        {prefs.show_photo && <Avatar photo={photo} name={c.name} size={32} ring={accent} />}
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold tracking-tight" style={{ fontSize: f(10), lineHeight: 1.02 }}>
            {c.name}
          </h1>
          {c.headline && (
            <p className="font-semibold" style={{ fontSize: f(3.8), marginTop: f(1.6), color: accent }}>
              {c.headline}
            </p>
          )}
          <ContactLine c={c} />
        </div>
        {c.qr && <QrTag value={c.qr} size={18} />}
      </header>
    );
  // compact and technical
  return (
    <header className="flex items-start" style={{ gap: mm(5), borderBottom: tpl === "technical" ? `${mm(0.6)} solid ${accent}` : `${mm(0.3)} solid #d9dce2`, paddingBottom: mm(4) }}>
      {prefs.show_photo && <Avatar photo={photo} name={c.name} size={tpl === "compact" ? 20 : 24} round={tpl === "compact"} />}
      <div className="min-w-0 flex-1">
        <h1 className="font-semibold tracking-tight" style={{ fontSize: f(tpl === "compact" ? 7.6 : 8.6), lineHeight: 1.05, fontFamily: tpl === "technical" ? MONO : undefined }}>
          {c.name}
        </h1>
        {c.headline && (
          <p className="font-medium" style={{ fontSize: f(3.4), marginTop: f(1.2), color: tpl === "technical" ? accent : A.c === "#000e21" ? "#067a2e" : accent }}>
            {c.headline}
          </p>
        )}
        <ContactLine c={c} />
      </div>
      {c.qr && <QrTag value={c.qr} size={tpl === "compact" ? 15 : 17} />}
    </header>
  );
}

/* The navy side panel of the Modern design (first page only). */
function SideTitle({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <h3 className="font-semibold uppercase" style={{ fontSize: f(2.7), letterSpacing: "0.14em", color: accent === ACCENTS.navy.c ? "#7fe0a0" : "rgba(255,255,255,.78)" }}>
      {children}
    </h3>
  );
}

function Side({ c, photo, prefs, accent }: { c: C; photo: string | null; prefs: ResumePrefs; accent: string }) {
  return (
    <div className="h-full text-white" style={{ background: accent, padding: `${mm(14)} ${mm(8)}`, display: "grid", alignContent: "start", gap: f(6) }}>
      {prefs.show_photo && (
        <div style={{ justifySelf: "start" }}>
          <Avatar photo={photo} name={c.name} size={36} ring="rgba(255,255,255,.25)" />
        </div>
      )}
      <section style={{ display: "grid", gap: f(1.4) }}>
        <SideTitle accent={accent}>Contact</SideTitle>
        {c.contact.map((x) => (
          <p key={x} style={{ fontSize: f(2.85), overflowWrap: "anywhere" }}>
            {x}
          </p>
        ))}
        {c.links.map(([k, v]) => (
          <p key={k} style={{ fontSize: f(2.6), overflowWrap: "anywhere" }} className="text-white/80">
            {clean(v)}
          </p>
        ))}
      </section>
      {c.active && !prefs.hide.includes("graas") && (
        <section style={{ display: "grid", gap: f(1) }}>
          <SideTitle accent={accent}>GRAAS member</SideTitle>
          <p className="readout" style={{ fontSize: f(2.8) }}>
            {c.m.member_no}
          </p>
          {c.qr ? (
            <div style={{ justifySelf: "start", marginTop: f(1) }}>
              <QrTag value={c.qr} size={20} dark />
            </div>
          ) : (
            <p className="text-white/70" style={{ fontSize: f(2.5) }}>
              Verify at graas.org.in/verify
            </p>
          )}
        </section>
      )}
      {c.skills.length > 0 && (
        <section style={{ display: "grid", gap: f(1.2) }}>
          <SideTitle accent={accent}>Skills</SideTitle>
          {c.skills.map((s) => (
            <p key={s} style={{ fontSize: f(2.95) }}>
              {s}
            </p>
          ))}
        </section>
      )}
      {c.languages.length > 0 && (
        <section style={{ display: "grid", gap: f(1.2) }}>
          <SideTitle accent={accent}>Languages</SideTitle>
          <p style={{ fontSize: f(2.95) }}>{c.languages.join(", ")}</p>
        </section>
      )}
    </div>
  );
}

/* One A4 sheet. */
function Sheet({ c, tpl, accent, prefs, photo, first, n, total, blocks, sheetRef }: { c: C; tpl: Tpl; accent: string; prefs: ResumePrefs; photo: string | null; first: boolean; n: number; total: number; blocks: Block[]; sheetRef?: React.Ref<HTMLDivElement> }) {
  const g = GEO[tpl];
  const side = !!g.side;
  const running = !first && (
    <p className="flex items-center justify-between font-medium" style={{ fontSize: f(2.6), color: MUTED, borderBottom: `${mm(0.25)} solid #e2e4e9`, paddingBottom: mm(1.4), marginBottom: mm(3.4), fontFamily: tpl === "technical" ? MONO : undefined }}>
      <span>{c.name}</span>
      <span>Resume, continued</span>
    </p>
  );
  const flow = (
    <div style={{ display: "grid", gap: f(g.gap), alignContent: "start" }}>
      {blocks.map((b) => (
        <div key={b.key}>{b.node}</div>
      ))}
    </div>
  );
  return (
    <div ref={sheetRef} className="cert-sheet relative w-full overflow-hidden bg-white text-ink" style={{ aspectRatio: "210 / 297" }}>
      {tpl === "creative" && <span className="absolute inset-y-0 left-0" style={{ width: mm(5), background: accent }} aria-hidden="true" />}
      {side ? (
        <div className="grid h-full" style={{ gridTemplateColumns: `${mm(g.side!)} 1fr` }}>
          {first ? <Side c={c} photo={photo} prefs={prefs} accent={accent} /> : <div style={{ background: accent }} aria-hidden="true" />}
          <div style={{ padding: `${mm(g.top)} ${mm(g.x)} ${mm(g.bottom)}`, display: "grid", alignContent: "start", gap: f(5.5) }}>
            {first && <Head c={c} tpl={tpl} accent={accent} photo={photo} prefs={prefs} />}
            {running}
            {flow}
          </div>
        </div>
      ) : (
        <div style={{ padding: `${mm(g.top)} ${mm(g.x)} ${mm(g.bottom)}`, display: "grid", alignContent: "start", gap: f(5) }}>
          {first && <Head c={c} tpl={tpl} accent={accent} photo={photo} prefs={prefs} />}
          {running}
          {flow}
        </div>
      )}
      {prefs.show_brand && (
        <p className="absolute flex items-center" style={{ left: mm(g.side ? g.side + g.x : g.x), bottom: mm(5), gap: mm(1.6), fontSize: f(2.2), color: "#6b7280" }}>
          <LogoMark style={{ width: mm(4.6), height: "auto", display: "block" }} />
          <span>
            <b className="font-semibold text-[#000e21]">Global Robotics And Automation Society</b>
            {c.active ? ` · Verified at graas.org.in/m/${c.m.member_no}` : " · graas.org.in"}
          </span>
        </p>
      )}
      {total > 1 && (
        <p className="absolute" style={{ right: mm(g.x), bottom: mm(5.5), fontSize: f(2.3), color: "#8e919a" }}>
          Page {n} of {total}
        </p>
      )}
    </div>
  );
}

/* Measures the header and every block in a hidden copy of the page, then packs blocks into pages. */
function usePages(c: C | null, tpl: Tpl, accent: string, prefs: ResumePrefs, photo: string | null) {
  const box = useRef<HTMLDivElement>(null);
  const [plan, setPlan] = useState<{ pages: number[][]; scale: number; tooTall: boolean }>({ pages: [[]], scale: 1, tooTall: false });
  const blocks = useMemo(() => (c ? blocksFor(c, tpl, accent) : []), [c, tpl, accent]);
  // Measure again once the fonts have loaded and whenever the window width changes.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const again = () => setTick((t) => t + 1);
    document.fonts?.ready.then(again).catch(() => {});
    window.addEventListener("resize", again);
    return () => window.removeEventListener("resize", again);
  }, []);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !c) return;
    const g = GEO[tpl];
    const width = el.getBoundingClientRect().width;
    if (!width) return;
    const k = width / 210;
    const pack = (s: number) => {
      el.style.setProperty("--rs", String((g.scale ?? 1) * s));
      const headBox = (el.querySelector("[data-head]") as HTMLElement | null)?.getBoundingClientRect().height ?? 0;
      // The Executive header band is pulled up into the top margin, so that part takes no room.
      const head = tpl === "executive" ? Math.max(0, headBox - g.top * k) : headBox;
      const run = ((el.querySelector("[data-run]") as HTMLElement | null)?.getBoundingClientRect().height ?? 0) + 3.4 * k;
      const hs = [...el.querySelectorAll("[data-blk]")].map((n) => (n as HTMLElement).getBoundingClientRect().height);
      const gap = g.gap * k * (g.scale ?? 1) * s;
      const headGap = (g.side ? 5.5 : 5) * k * (g.scale ?? 1) * s;
      const inner = (PAGE_H - g.top - g.bottom) * k;
      const cap1 = inner - (head ? head + headGap : 0);
      const capN = inner - run - headGap;
      const pages: number[][] = [[]];
      let used = 0,
        cap = cap1,
        tooTall = false;
      hs.forEach((h, i) => {
        const add = (used > 0 ? gap : 0) + h;
        const withNext = blocks[i]?.keepNext && i + 1 < hs.length ? add + gap + hs[i + 1] : add;
        if (used > 0 && used + withNext > cap + 0.5) {
          pages.push([]);
          used = 0;
          cap = capN;
        }
        if (h > cap) tooTall = true;
        pages[pages.length - 1].push(i);
        used += (used > 0 ? gap : 0) + h;
      });
      return { pages, tooTall };
    };
    let s = 1;
    let r = pack(1);
    if (prefs.one_page) {
      while (r.pages.length > 1 && s > 0.85) {
        s = Math.round((s - 0.03) * 100) / 100;
        r = pack(s);
      }
    }
    setPlan({ pages: r.pages, scale: s, tooTall: r.tooTall });
  }, [c, tpl, accent, prefs, photo, blocks, tick]);

  const g = GEO[tpl];
  const colW = g.side ? 210 - g.side - 2 * g.x : 210 - 2 * g.x;
  const measure = c && (
    <div ref={box} aria-hidden="true" className="pointer-events-none invisible absolute inset-x-0 top-0" style={{ containerType: "inline-size" }}>
      <div className="relative w-full">
        <div style={{ width: mm(g.side ? colW : 210 - 2 * g.x), marginLeft: mm(g.side ? g.side + g.x : g.x) }}>
          <div data-head>
            <Head c={c} tpl={tpl} accent={accent} photo={photo} prefs={prefs} />
          </div>
          <p data-run className="font-medium" style={{ fontSize: f(2.6), paddingBottom: mm(1.4), marginBottom: mm(3.4), borderBottom: `${mm(0.25)} solid #e2e4e9` }}>
            {c.name}
          </p>
          {blocks.map((b) => (
            <div key={b.key} data-blk>
              {b.node}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  return { blocks, plan, measure };
}

export default function Resume({ a, goDocuments }: { a: any; goDocuments?: () => void }) {
  const [mp, setMp] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [prefs, setPrefs] = useState<ResumePrefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState<"" | "saving" | "saved">("");
  const [mounted, setMounted] = useState(false);
  const loaded = useRef(false);
  const p = a.profile;
  const photo = usePhoto(p.id, p.photo_updated_at);
  useEffect(() => {
    setMounted(true);
    const sb = browserClient();
    Promise.all([sb.rpc("my_profile"), sb.rpc("my_public"), sb.rpc("my_documents")]).then(([pr, pub, d]) => {
      setMp(pr.data ?? {});
      if (pub.data?.resume_prefs) setPrefs({ ...DEFAULT_PREFS, ...pub.data.resume_prefs });
      setDocs(Array.isArray(d.data) ? d.data : []);
      loaded.current = true;
    });
    document.documentElement.classList.add("print-flow");
    return () => document.documentElement.classList.remove("print-flow");
  }, []);
  // Save the choices a moment after the member stops changing them.
  useEffect(() => {
    if (!loaded.current) return;
    setSaved("saving");
    const t = setTimeout(async () => {
      const { data } = await browserClient().rpc("member_profile_prefs", { p: { resume_prefs: prefs } });
      setSaved(data?.ok ? "saved" : "");
    }, 700);
    return () => clearTimeout(t);
  }, [prefs]);

  const tpl = prefs.template;
  const accent = (ACCENTS[prefs.accent] ?? ACCENTS.navy).c;
  const c = useContent(a, mp, docs, prefs);
  const { blocks, plan, measure } = usePages(c, tpl, accent, prefs, photo);
  if (!mp || !c) return <div className="card p-8 text-ink2">Loading your resume…</div>;
  const set = (x: Partial<ResumePrefs>) => setPrefs((v) => ({ ...v, ...x }));
  const allSkills = (mp.skills ?? []) as string[];
  const total = plan.pages.length;
  const sheets = (print: boolean) =>
    plan.pages.map((ids, i) => (
      <div key={i} style={{ containerType: "inline-size" }} className={print ? "resume-print-page" : "shadow-[var(--shadow-card)] ring-1 ring-line"}>
        <div style={{ ["--rs" as any]: String((GEO[tpl].scale ?? 1) * plan.scale) }}>
          <Sheet c={c} tpl={tpl} accent={accent} prefs={prefs} photo={photo} first={i === 0} n={i + 1} total={total} blocks={ids.map((x) => blocks[x]).filter(Boolean)} />
        </div>
      </div>
    ));

  return (
    // On wide screens the options and the pages are two panes that scroll separately, so a long resume never pushes the options away.
    <div className="grid gap-6 xl:h-[calc(100vh-9rem)] xl:min-h-[34rem] xl:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="grid content-start gap-4 print:hidden xl:h-full xl:overflow-y-auto xl:overscroll-contain xl:pb-2 xl:pr-1">
        <div className="card grid gap-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="h-card">Resume</h2>
              <p className="text-sm text-ink2">Built from your career profile. Change the profile and the resume follows.</p>
            </div>
            <span className="readout shrink-0 rounded-full bg-mist px-2.5 py-1 text-xs font-semibold text-ink2">
              {total} {total === 1 ? "page" : "pages"}
            </span>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            Download PDF
          </button>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold">Design</legend>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => set({ template: t.id })} aria-pressed={tpl === t.id} className={`rounded-xl border p-2.5 text-left transition-colors ${tpl === t.id ? "border-ink bg-mist" : "border-line hover:border-slate5"}`}>
                  <Thumb id={t.id} accent={accent} />
                  <b className="mt-2 block text-sm font-semibold">{t.name}</b>
                  <span className="block text-xs leading-snug text-ink2">{t.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ACCENTS).map(([k, v]) => (
                <button key={k} type="button" onClick={() => set({ accent: k })} aria-pressed={prefs.accent === k} title={v.name} className={`h-8 w-8 rounded-full ring-offset-2 ${prefs.accent === k ? "ring-2 ring-ink" : ""}`} style={{ background: v.c }}>
                  <span className="sr-only">{v.name}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-2.5">
            <Toggle on={prefs.show_photo} set={(v) => set({ show_photo: v })} label="Show my photo" />
            <Toggle on={prefs.show_qr} set={(v) => set({ show_qr: v })} label="Show the GRAAS QR code" hint={c.active ? "Anyone who scans it sees that your membership is genuine." : "Appears once your membership is active."} />
            <Toggle on={prefs.show_brand} set={(v) => set({ show_brand: v })} label="Show the GRAAS mark" hint="A small line at the foot of each page: Global Robotics And Automation Society, with your verified profile address." />
            <Toggle on={prefs.one_page} set={(v) => set({ one_page: v })} label="Try to keep to one page" hint="Text shrinks a little before a second page is added." />
          </div>
          {allSkills.length > 0 && !prefs.hide.includes("skills") && (
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-semibold">
                Skills on the resume <span className="font-normal text-ink2">({c.skills.length} of up to {RESUME_SKILLS})</span>
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {allSkills.map((sk) => {
                  const on = c.skills.some((x) => x.toLowerCase() === sk.toLowerCase());
                  const full = !on && c.skills.length >= RESUME_SKILLS;
                  return (
                    <button
                      key={sk}
                      type="button"
                      disabled={full}
                      aria-pressed={on}
                      onClick={() => set({ skills: on ? c.skills.filter((x) => x.toLowerCase() !== sk.toLowerCase()) : [...c.skills, sk] })}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${on ? "border-ink bg-ink text-white" : full ? "border-line text-slate5" : "border-line hover:border-ink"}`}
                    >
                      {sk}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-ink2">Pick your strongest skills. Twelve keep the resume clean and leave room for the QR code. Add more skills in your career profile.</p>
            </fieldset>
          )}
          <details className="rounded-xl border border-line px-3 py-2">
            <summary className="cursor-pointer text-sm font-semibold">Sections to include</summary>
            <div className="mt-2 grid gap-1.5">
              {SECTIONS.map(([k, label]) => (
                <label key={k} className="flex items-center gap-2.5 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-[#067a2e]" checked={!prefs.hide.includes(k)} onChange={(e) => set({ hide: e.target.checked ? prefs.hide.filter((x) => x !== k) : [...prefs.hide, k] })} />
                  {label}
                </label>
              ))}
            </div>
          </details>
          <p className="-mt-2 text-xs text-ink2">
            In the print window choose “Save as PDF”, paper A4, margins none. {saved === "saving" ? "Saving your choices…" : saved === "saved" ? "Your choices are saved." : ""}
          </p>
        </div>
        {(c.empty || plan.tooTall || plan.scale < 1 || total > 2) && (
          <div className={`rounded-2xl px-4 py-3 text-sm ${c.empty || plan.tooTall ? "bg-[#fff6e5] text-[#7a4b00]" : "bg-go-soft text-go-deep"}`}>
            {c.empty
              ? "Your resume is nearly empty. Add a summary, skills and a project in your career profile first."
              : plan.tooTall
                ? "One description is longer than a page. Split it into shorter points in your career profile."
                : plan.scale < 1
                  ? `Text set at ${Math.round(plan.scale * 100)}% so everything fits on one page.`
                  : `Your resume runs to ${total} pages. Recruiters usually read two; consider hiding older items.`}
          </div>
        )}
        <div className="card grid gap-2 p-5 text-sm">
          <p className="font-semibold">
            Uploading your own resume <span className="ml-1 rounded-full bg-[#fff6e5] px-2 py-0.5 text-xs font-semibold text-[#7a4b00]">Not recommended</span>
          </p>
          <p className="text-ink2">Companies on GRAAS find, match and shortlist you through your GRAAS profile and this resume. An uploaded file cannot be searched or matched, so you get fewer opportunities. Upload one only if a company asks for its own format.</p>
          {goDocuments && (
            <button type="button" className="justify-self-start text-sm font-semibold text-ink2 underline underline-offset-4 hover:text-ink" onClick={goDocuments}>
              Upload anyway in Documents
            </button>
          )}
        </div>
      </aside>

      <div className="min-w-0 xl:h-full xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
        <style>{"@media print { @page { size: A4 portrait; margin: 0; } }"}</style>
        {/* On narrower screens the options sit above; this bar stays in view while scrolling through the pages. */}
        <div className="sticky top-20 z-10 mx-auto mb-4 flex max-w-[860px] items-center justify-between gap-3 rounded-full bg-white/95 px-4 py-2 shadow-[var(--shadow-card)] backdrop-blur print:hidden xl:hidden">
          <span className="text-sm font-semibold">
            {TEMPLATES.find((t) => t.id === tpl)?.name} · {total} {total === 1 ? "page" : "pages"}
          </span>
          <span className="flex gap-2">
            <button type="button" className="btn btn-ghost !min-h-9 !px-3 !py-1 text-sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              Options
            </button>
            <button type="button" className="btn btn-primary !min-h-9 !px-3 !py-1 text-sm" onClick={() => window.print()}>
              PDF
            </button>
          </span>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="relative mx-auto grid min-w-[560px] max-w-[860px] gap-6">
            {measure}
            {sheets(false)}
          </div>
        </div>
      </div>
      {mounted && createPortal(<div className="print-root">{sheets(true)}</div>, document.body)}
    </div>
  );
}

function Toggle({ on, set, label, hint }: { on: boolean; set: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="peer sr-only" checked={on} onChange={(e) => set(e.target.checked)} />
      <span className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ink ${on ? "bg-go" : "bg-line"}`} aria-hidden="true">
        <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
      </span>
      <span className="text-sm">
        <b className="font-semibold">{label}</b>
        {hint && <span className="block text-xs text-ink2">{hint}</span>}
      </span>
    </label>
  );
}

/* Small drawings of each design for the picker. */
function Thumb({ id, accent }: { id: Tpl; accent: string }) {
  const bar = (w: string, o = 0.18) => <span className="block h-1 rounded-full" style={{ width: w, background: `rgba(0,14,33,${o})` }} />;
  return (
    <span className="relative block aspect-[210/150] overflow-hidden rounded-md bg-white ring-1 ring-line" aria-hidden="true">
      {id === "modern" && <span className="absolute inset-y-0 left-0 w-[30%]" style={{ background: accent }} />}
      {id === "executive" && <span className="absolute inset-x-0 top-0 h-[34%]" style={{ background: accent }} />}
      {id === "creative" && <span className="absolute inset-y-0 left-0 w-[5%]" style={{ background: accent }} />}
      <span className={`absolute grid gap-1 ${id === "modern" ? "left-[36%] right-[8%] top-[14%]" : id === "executive" ? "left-[10%] right-[10%] top-[44%]" : "left-[12%] right-[10%] top-[14%]"}`}>
        {id === "technical" ? <span className="block h-1.5 w-1/2 rounded-sm" style={{ background: accent }} /> : <span className="block h-1.5 w-2/3 rounded-full" style={{ background: id === "executive" ? "rgba(0,14,33,.5)" : accent }} />}
        {bar("90%")}
        {bar("75%")}
        {id === "creative" || id === "technical" ? (
          <span className="flex gap-0.5">
            <span className="block h-1.5 w-3 rounded-full" style={{ background: accent, opacity: 0.6 }} />
            <span className="block h-1.5 w-4 rounded-full" style={{ background: accent, opacity: 0.6 }} />
            <span className="block h-1.5 w-2 rounded-full" style={{ background: accent, opacity: 0.6 }} />
          </span>
        ) : (
          bar("85%")
        )}
        {bar(id === "compact" ? "95%" : "60%")}
        {id === "compact" && bar("92%")}
      </span>
      {id === "classic" && <span className="absolute left-[30%] right-[30%] top-[6%] h-1.5 rounded-full bg-[rgba(0,14,33,.6)]" />}
    </span>
  );
}
