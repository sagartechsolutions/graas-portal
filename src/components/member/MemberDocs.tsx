"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import "@fontsource/ibm-plex-serif/400.css";
import "@fontsource/ibm-plex-serif/400-italic.css";
import "@fontsource/ibm-plex-serif/600.css";
import type { CSSProperties, ReactNode } from "react";
import { LogoMark, LogoShapes } from "@/components/site/Logo";
import { shortDate } from "@/lib/money";
import { describe, initials, isIndividual, usePhoto } from "./Details";
import Qr from "./Qr";

/*
 * Member ID card and certificate, in the design Sagar approved on 25 Nov 2026 (formal set):
 * the official GRAAS logo unchanged, a six-axis robot arm drawn in line art, a fine-line (guilloche) border,
 * a round seal carrying the logo, and no signatures. Everything is drawn from the member's current
 * profile and membership type. Sizes are container units, so the same design prints at true size:
 * the card at 85.6 x 54 mm and the certificate on A4 landscape.
 */

const INK = "#000e21";
const SERIF = '"IBM Plex Serif", Georgia, serif';
const TYPE_NAME: Record<string, string> = { student: "Student Member", professional: "Professional Member", institution: "Institution Member", industry: "Industry Member" };

/* ---------- drawing helpers ---------- */

type P = { x: number; y: number };

/** Guilloche ring: phase-shifted wavy circles, like the fine line work on degrees and banknotes. */
function rosetteD(cx: number, cy: number, R: number, amp: number, waves: number, lines: number, steps = 540) {
  let d = "";
  for (let k = 0; k < lines; k++) {
    const ph = ((k / lines) * Math.PI * 2) / waves;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const r = R + amp * Math.sin(waves * (t + ph));
      d += (i ? "L" : "M") + (cx + r * Math.cos(t)).toFixed(2) + " " + (cy + r * Math.sin(t)).toFixed(2);
    }
    d += "Z";
  }
  return d;
}

/** Guilloche band along a straight line: interlaced sine waves. */
function bandD(x1: number, y1: number, x2: number, y2: number, half: number, period: number, lines: number) {
  const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
  const n = Math.max(1, Math.round(L / period)), per = L / n, steps = Math.ceil(L * 2);
  let d = "";
  for (let k = 0; k < lines; k++) {
    const ph = (k / lines) * Math.PI * 2;
    for (let i = 0; i <= steps; i++) {
      const s = (i / steps) * L, o = half * Math.sin((2 * Math.PI * s) / per + ph);
      d += (i ? "L" : "M") + (x1 + ux * s + nx * o).toFixed(2) + " " + (y1 + uy * s + ny * o).toFixed(2);
    }
  }
  return d;
}

let frameCache: { bands: string; corners: string; bg: string } | null = null;
function certFrame() {
  if (frameCache) return frameCache;
  frameCache = {
    bands: bandD(13, 11.5, 284, 11.5, 2.3, 7, 4) + bandD(13, 198.5, 284, 198.5, 2.3, 7, 4) + bandD(11.5, 13, 11.5, 197, 2.3, 7, 4) + bandD(285.5, 13, 285.5, 197, 2.3, 7, 4),
    corners: [[11.5, 11.5], [285.5, 11.5], [11.5, 198.5], [285.5, 198.5]].map(([x, y]) => rosetteD(x, y, 3.4, 0.9, 8, 5, 240)).join(""),
    bg: rosetteD(148.5, 112, 62, 6, 18, 14) + rosetteD(148.5, 112, 44, 4, 14, 10),
  };
  return frameCache;
}
let sealRing: string | null = null;
const sealRingD = () => (sealRing ??= rosetteD(50, 50, 45, 2.4, 36, 6, 720));

/** A six-axis industrial robot arm, side view, in fine line art. */
export function RobotArm({ stroke = INK, fill = "#ffffff", detail = "#8e919a", accent = "#02ae3e", sw = 2, style }: { stroke?: string; fill?: string; detail?: string; accent?: string; sw?: number; style?: CSSProperties }) {
  const arc = (c: P, r: number, a0: number, a1: number, n = 40) => Array.from({ length: n + 1 }, (_, i) => a0 + (a1 - a0) * (i / n)).map((a) => ({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) }));
  const poly = (ps: P[]) => "M" + ps.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join("L") + "Z";
  const link = (p1: P, r1: number, p2: P, r2: number) => {
    const dx = p2.x - p1.x, dy = p2.y - p1.y, d = Math.hypot(dx, dy), th = Math.atan2(dy, dx), al = Math.acos((r1 - r2) / d);
    return poly([...arc(p2, r2, th - al, th + al), ...arc(p1, r1, th + al, th - al + 2 * Math.PI)]);
  };
  const off = (p1: P, p2: P, k: number, s: number) => {
    const dx = p2.x - p1.x, dy = p2.y - p1.y, d = Math.hypot(dx, dy);
    return { x: p1.x + dx * k - (dy / d) * s, y: p1.y + dy * k + (dx / d) * s };
  };
  const ln = (a: P, b: P, key: string, c = detail, w = sw * 0.55) => <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c} strokeWidth={w} strokeLinecap="round" />;
  const S = { stroke, strokeWidth: sw, strokeLinejoin: "round" as const, fill };
  const J2 = { x: 122, y: 262 }, J3 = { x: 232, y: 118 }, J5 = { x: 352, y: 162 };
  const bolts = (c: P, r: number, n: number, br: number, key: string) =>
    Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2).map((a, i) => <circle key={key + i} cx={c.x + r * Math.cos(a)} cy={c.y + r * Math.sin(a)} r={br} fill={stroke} />);
  return (
    <svg viewBox="30 60 350 320" style={style} aria-hidden="true">
      <rect x="40" y="362" width="168" height="12" rx="3" {...S} />
      <circle cx="54" cy="368" r="2.6" fill={stroke} />
      <circle cx="194" cy="368" r="2.6" fill={stroke} />
      <path d="M64 362 L74 306 Q76 296 86 296 L158 296 Q168 296 170 306 L180 362 Z" {...S} />
      {ln({ x: 70, y: 334 }, { x: 174, y: 334 }, "b1")}
      {ln({ x: 72, y: 322 }, { x: 172, y: 322 }, "b2")}
      <rect x="52" y="240" width="34" height="42" rx="6" {...S} />
      {ln({ x: 60, y: 248 }, { x: 60, y: 274 }, "m1")}
      {ln({ x: 68, y: 248 }, { x: 68, y: 274 }, "m2")}
      <path d="M160 300 C 210 290, 250 210, 252 150" fill="none" stroke={detail} strokeWidth={sw * 1.1} strokeLinecap="round" />
      <path d={link(J2, 30, J3, 21)} {...S} />
      {ln(off(J2, J3, 0.22, -13), off(J2, J3, 0.86, -9), "l1")}
      {ln(off(J2, J3, 0.22, 13), off(J2, J3, 0.86, 9), "l2")}
      <circle cx={J2.x} cy={J2.y} r="44" {...S} />
      <circle cx={J2.x} cy={J2.y} r="30" fill="none" stroke={detail} strokeWidth={sw * 0.55} />
      {bolts(J2, 37, 8, 1.7, "s")}
      <circle cx={J2.x} cy={J2.y} r="11" {...S} />
      <circle cx={J2.x} cy={J2.y} r="3.4" fill={stroke} />
      <path d={link(J3, 24, { x: 196, y: 92 }, 16)} {...S} />
      <path d={link(J3, 22, J5, 13)} {...S} />
      {ln(off(J3, J5, 0.25, -9), off(J3, J5, 0.82, -6), "f1")}
      {ln(off(J3, J5, 0.55, -11), off(J3, J5, 0.55, 11), "f2")}
      <circle cx={J3.x} cy={J3.y} r="27" {...S} />
      <circle cx={J3.x} cy={J3.y} r="17" fill="none" stroke={detail} strokeWidth={sw * 0.55} />
      {bolts(J3, 22, 6, 1.4, "e")}
      <circle cx={J3.x} cy={J3.y} r="7" {...S} />
      <circle cx={J3.x} cy={J3.y} r="2.4" fill={stroke} />
      <circle cx={J5.x} cy={J5.y} r="16" {...S} />
      <circle cx={J5.x} cy={J5.y} r="5" fill={stroke} />
      <rect x={J5.x - 11} y={J5.y + 15} width="22" height="10" rx="2" {...S} />
      <rect x={J5.x - 17} y={J5.y + 25} width="34" height="14" rx="2.5" {...S} />
      {ln({ x: J5.x - 11, y: J5.y + 32 }, { x: J5.x + 11, y: J5.y + 32 }, "g1")}
      <path d={`M${J5.x - 15} ${J5.y + 39} h7 v20 l-3 5 h-4 Z`} {...S} />
      <path d={`M${J5.x + 15} ${J5.y + 39} h-7 v20 l3 5 h4 Z`} {...S} />
      <circle cx={J5.x} cy={J5.y + 55} r="6.5" fill={accent} />
    </svg>
  );
}

/** The round seal: guilloche edge, lettering, and the official GRAAS mark in the centre. */
function Seal({ id, ring = true, style }: { id: string; ring?: boolean; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" style={style} aria-hidden="true">
      <circle cx="50" cy="50" r="49" fill="#fff" />
      <path d={sealRingD()} fill="none" stroke={INK} strokeWidth={ring ? 0.22 : 0.3} />
      {ring ? (
        <>
          <circle cx="50" cy="50" r="41" fill="#fff" stroke={INK} strokeWidth="0.5" />
          <circle cx="50" cy="50" r="29.5" fill="#fff" stroke={INK} strokeWidth="0.9" />
          <defs>
            <path id={id} d="M50,50 m-35.2,0 a35.2,35.2 0 1,1 70.4,0 a35.2,35.2 0 1,1 -70.4,0" />
          </defs>
          <text fontSize="4.6" fontWeight="600" fill={INK} letterSpacing="0.83" style={{ fontFamily: "var(--font-sans)" }}>
            <textPath href={`#${id}`} startOffset="0" textLength="221" lengthAdjust="spacing">
              GLOBAL ROBOTICS AND AUTOMATION SOCIETY • MEMBERSHIP •
            </textPath>
          </text>
          <svg x="33" y="34" width="34" height="31" viewBox="80 38 382 340">
            <LogoShapes />
          </svg>
        </>
      ) : (
        <>
          <circle cx="50" cy="50" r="38" fill="#fff" stroke={INK} strokeWidth="1" />
          <svg x="28" y="29" width="44" height="40" viewBox="80 38 382 340">
            <LogoShapes />
          </svg>
        </>
      )}
    </svg>
  );
}

/** GRAAS mark and wordmark as on the website; `full` adds the Society's name underneath. */
function Lockup({ u, scale, tone = "dark", full = true }: { u: (mm: number) => string; scale: number; tone?: "dark" | "light"; full?: boolean }) {
  return (
    <span className="inline-flex items-center" style={{ gap: u(2.5 * scale) }}>
      <LogoMark tone={tone} style={{ width: u(11.5 * scale), height: "auto", display: "block" }} />
      <span className="flex flex-col text-left leading-none">
        <span className="font-bold tracking-[0.04em]" style={{ fontSize: u(6 * scale), color: tone === "dark" ? INK : "#fff" }}>
          GRAAS
        </span>
        {full && (
          <span className="font-medium tracking-[0.025em]" style={{ fontSize: u(1.75 * scale), marginTop: u(1 * scale), color: tone === "dark" ? "#5a616b" : "rgba(255,255,255,.7)" }}>
            Global Robotics And Automation Society
          </span>
        )}
      </span>
    </span>
  );
}

function Portrait({ url, name, org, style }: { url: string | null; name: string; org: boolean; style: CSSProperties }) {
  return (
    <div className="relative overflow-hidden bg-mist" style={style}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className={`block h-full w-full ${org ? "bg-white object-contain p-[7%]" : "object-cover"}`} />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-semibold text-slate5">{initials(name)}</span>
      )}
    </div>
  );
}

/* ---------- shared data ---------- */

type DocProps = { a: any; org?: any };

function useDoc({ a }: DocProps) {
  const m = a.membership, p = a.profile;
  const audience: string = m.plan.audience;
  const isOrg = !isIndividual(audience);
  const title: string = (isOrg ? p.organisation || m.organisation || p.full_name : p.full_name) ?? "";
  const rows = describe(p, audience);
  const origin = typeof window === "undefined" ? "https://graas.org.in" : window.location.origin;
  const photo = usePhoto(p.id, p.photo_updated_at);
  const typeName = m.plan.code === "school-student" ? "School Student Member" : (TYPE_NAME[audience] ?? `${m.plan.name} Member`);
  return { m, p, audience, isOrg, title, rows, photo, url: `${origin}/verify?id=${m.member_no}`, typeName };
}

/* ---------- Member ID card (85.6 x 54 mm, landscape) ---------- */

const cu = (mm: number) => `${((mm * 100) / 85.6).toFixed(3)}cqw`;

function CardShell({ children }: { children: ReactNode }) {
  return (
    <div className="id-side w-full" style={{ containerType: "inline-size" }}>
      <div className="relative aspect-[85.6/54] w-full overflow-hidden bg-white text-ink shadow-[0_6px_20px_-8px_rgb(0_14_33/0.35)] ring-1 ring-line" style={{ borderRadius: cu(3) }}>
        {children}
      </div>
    </div>
  );
}

function Strip({ left, right, h }: { left: ReactNode; right: ReactNode; h: number }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink text-white" style={{ height: cu(h), padding: `0 ${cu(4.5)}`, borderTop: `${cu(0.7)} solid #02ae3e` }}>
      {left}
      {right}
    </div>
  );
}

export function IdFront(props: DocProps) {
  const { m, isOrg, title, rows, photo, typeName } = useDoc(props);
  const shown = rows.filter((r) => r.label !== "City").slice(0, 3);
  return (
    <CardShell>
      <RobotArm stroke="#dde1e6" fill="transparent" detail="#eceef1" accent="#cdeed8" sw={2.2} style={{ position: "absolute", right: cu(3), bottom: cu(9.6), width: cu(30) }} />
      <div className="absolute" style={{ left: cu(4.5), top: cu(3.6) }}>
        <Lockup u={cu} scale={0.62} full={false} />
      </div>
      <div className="absolute text-right" style={{ right: cu(4.5), top: cu(4.4) }}>
        <p className="font-semibold" style={{ fontSize: cu(1.9) }}>
          Member ID card
        </p>
        <p className="text-slate7" style={{ fontSize: cu(1.55), marginTop: cu(0.5) }}>
          Global Robotics And Automation Society
        </p>
      </div>
      <div className="absolute bg-line" style={{ left: cu(4.5), right: cu(4.5), top: cu(12.6), height: cu(0.25) }} />
      <div className="absolute bg-white" style={{ left: cu(4.5), top: cu(15), width: cu(20.5), height: cu(25), border: `${cu(0.25)} solid ${INK}`, padding: cu(0.6) }}>
        <Portrait url={photo} name={title} org={isOrg} style={{ width: "100%", height: "100%", fontSize: cu(7) }} />
      </div>
      <div className="absolute" style={{ left: cu(28.5), right: cu(4), top: cu(15.2) }}>
        <p className="font-semibold tracking-[-0.015em]" style={{ fontSize: cu(title.length > 28 ? 3.2 : 3.9), lineHeight: 1.1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {title}
        </p>
        <p className="inline-block rounded-full bg-go-soft font-semibold text-go-deep" style={{ marginTop: cu(1), fontSize: cu(1.7), padding: `${cu(0.35)} ${cu(1.6)}` }}>
          {typeName}
        </p>
        <dl className="grid items-baseline" style={{ gridTemplateColumns: `${cu(isOrg ? 13 : 10.5)} 1fr`, rowGap: cu(0.8), marginTop: cu(1.6) }}>
          {shown.map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-slate7" style={{ fontSize: cu(1.55) }}>
                {r.label === "Represented by" ? "Contact" : r.label}
              </dt>
              <dd className="truncate font-medium" style={{ fontSize: cu(2.1) }}>
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <Strip
        h={9}
        left={
          <div>
            <p className="text-white/60" style={{ fontSize: cu(1.4) }}>
              Membership number
            </p>
            <p className="readout font-medium" style={{ fontSize: cu(2.5), marginTop: cu(0.2) }}>
              {m.member_no}
            </p>
          </div>
        }
        right={
          <div className="text-right">
            <p className="text-white/60" style={{ fontSize: cu(1.4) }}>
              Valid until
            </p>
            <p className="readout font-medium" style={{ fontSize: cu(2.5), marginTop: cu(0.2) }}>
              {m.ends_on ? shortDate(m.ends_on) : "No end date"}
            </p>
          </div>
        }
      />
    </CardShell>
  );
}

export function IdBack(props: DocProps) {
  const { m, p, url } = useDoc(props);
  const org = props.org ?? {};
  const contact = org.email || "connect@graas.org.in";
  const guardian = p.guardian_name && p.guardian_phone ? `${p.guardian_name}, +91 ${p.guardian_phone}` : null;
  const host = (typeof window === "undefined" ? "graas.org.in" : window.location.host).replace(/^www\./, "");
  return (
    <CardShell>
      <div className="absolute" style={{ left: cu(4.5), top: cu(4.5), width: cu(23), height: cu(23), border: `${cu(0.25)} solid #e2e4e9`, padding: cu(0.8) }}>
        <Qr value={url} size={200} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
      <div className="absolute" style={{ left: cu(31), right: cu(4.5), top: cu(4.6) }}>
        <p className="font-semibold" style={{ fontSize: cu(2.6) }}>
          Scan to verify this membership
        </p>
        <p className="text-ink2" style={{ fontSize: cu(1.75), marginTop: cu(0.5) }}>
          or visit {host}/verify and enter the number
        </p>
        <p className="readout font-medium" style={{ fontSize: cu(2.9), marginTop: cu(2.2) }}>
          {m.member_no}
        </p>
        <dl className="grid" style={{ gridTemplateColumns: "auto 1fr", columnGap: cu(2.4), rowGap: cu(0.7), marginTop: cu(1.8), fontSize: cu(1.75) }}>
          <dt className="text-slate7">Member since</dt>
          <dd className="readout">{shortDate(m.starts_on)}</dd>
          {guardian && (
            <>
              <dt className="text-slate7">Parent or guardian</dt>
              <dd className="font-medium">{guardian}</dd>
            </>
          )}
        </dl>
      </div>
      <div className="absolute flex items-center justify-between border-t border-line" style={{ left: cu(4.5), right: cu(4.5), bottom: cu(9), gap: cu(3), paddingTop: cu(1.4) }}>
        <p className="text-ink2" style={{ fontSize: cu(1.5), lineHeight: 1.4 }}>
          This card is the property of the Global Robotics And Automation Society and is valid only with a current membership. If found, please return it to {contact}.
        </p>
        <Seal id={`seal-card-${m.id}`} ring={false} style={{ width: cu(11.5), height: cu(11.5), flex: "none" }} />
      </div>
      <Strip
        h={6.5}
        left={<Lockup u={cu} scale={0.42} tone="light" full={false} />}
        right={
          <p className="readout" style={{ fontSize: cu(2) }}>
            graas.org.in
          </p>
        }
      />
    </CardShell>
  );
}

/** Both sides, side by side on wide screens and stacked on phones; printed at true card size with cutting edges. */
export function IdCards(props: DocProps) {
  return (
    <div className="print-area print-id grid gap-6 lg:grid-cols-2">
      <figure className="grid gap-2">
        <IdFront {...props} />
        <figcaption className="text-sm text-ink2 print:hidden">Front</figcaption>
      </figure>
      <figure className="grid gap-2">
        <IdBack {...props} />
        <figcaption className="text-sm text-ink2 print:hidden">Back</figcaption>
      </figure>
    </div>
  );
}

/* ---------- Certificate (A4 landscape, 297 x 210 mm) ---------- */

const mu = (mm: number) => `${((mm * 100) / 297).toFixed(3)}cqw`;

export function Certificate(props: DocProps) {
  const { m, p, audience, isOrg, title, rows, url, photo, typeName } = useDoc(props);
  const f = certFrame();
  const issued = m.activated_at ?? m.starts_on;
  const details = isOrg ? [`Represented by ${p.full_name}${p.designation ? `, ${p.designation}` : ""}`] : rows.filter((r) => r.label !== "City").map((r) => r.value);
  const an = audience === "industry" || audience === "institution" ? "an" : "a";
  const k = { fontSize: mu(2.35), color: "#5a616b" } as const;
  const v = { fontSize: mu(3.1) } as const;
  return (
    <div className="overflow-x-auto pb-2">
      {/* Only while the certificate is on screen: print it on A4 landscape, edge to edge. */}
      <style>{"@media print { @page { size: A4 landscape; margin: 0; } }"}</style>
      <div className="print-area print-cert min-w-[720px]">
        <div style={{ containerType: "inline-size" }}>
          <div className="cert-sheet relative aspect-[297/210] w-full overflow-hidden bg-white text-ink shadow-[var(--shadow-card)] ring-1 ring-line">
            <svg viewBox="0 0 297 210" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              <path d={f.bg} fill="none" stroke={INK} strokeWidth="0.12" opacity="0.08" />
              <rect x="7" y="7" width="283" height="196" fill="none" stroke={INK} strokeWidth="0.6" />
              <path d={f.bands} fill="none" stroke="#5a616b" strokeWidth="0.22" />
              <rect x="16" y="16" width="265" height="178" fill="none" stroke={INK} strokeWidth="0.35" />
              <rect x="17.4" y="17.4" width="262.2" height="175.2" fill="none" stroke="#02ae3e" strokeWidth="0.3" />
              {[[11.5, 11.5], [285.5, 11.5], [11.5, 198.5], [285.5, 198.5]].map(([x, y]) => (
                <g key={`${x}-${y}`}>
                  <circle cx={x} cy={y} r="5" fill="#fff" stroke={INK} strokeWidth="0.35" />
                  <circle cx={x} cy={y} r="1" fill="#02ae3e" />
                </g>
              ))}
              <path d={f.corners} fill="none" stroke={INK} strokeWidth="0.18" />
            </svg>

            {/* membership record, top left */}
            <div className="absolute bg-white" style={{ left: mu(25), top: mu(25), width: mu(52), border: `${mu(0.3)} solid ${INK}` }}>
              <div style={{ padding: `${mu(1.6)} ${mu(2.4)}`, borderBottom: `${mu(0.25)} solid #e2e4e9` }}>
                <p style={k}>Membership number</p>
                <p className="readout font-medium" style={{ fontSize: mu(3.4) }}>
                  {m.member_no}
                </p>
              </div>
              <div className="grid grid-cols-2">
                <div style={{ padding: `${mu(1.6)} ${mu(2.4)}`, borderRight: `${mu(0.25)} solid #e2e4e9` }}>
                  <p style={k}>Valid from</p>
                  <p className="readout font-medium" style={v}>
                    {shortDate(m.starts_on)}
                  </p>
                </div>
                <div style={{ padding: `${mu(1.6)} ${mu(2.4)}` }}>
                  <p style={k}>Valid until</p>
                  <p className="readout font-medium" style={v}>
                    {m.ends_on ? shortDate(m.ends_on) : "No end date"}
                  </p>
                </div>
              </div>
            </div>

            {/* photo or logo, top right */}
            <div className="absolute bg-white" style={{ right: mu(25), top: mu(22), width: mu(27), height: mu(33), border: `${mu(0.35)} solid ${INK}`, padding: mu(1.1) }}>
              <Portrait url={photo} name={title} org={isOrg} style={{ width: "100%", height: "100%", fontSize: mu(9) }} />
            </div>

            {/* the Society */}
            <div className="absolute inset-x-0 text-center" style={{ top: mu(23) }}>
              <Lockup u={mu} scale={1.45} />
              <div className="flex items-center justify-center" style={{ gap: mu(2), marginTop: mu(4) }}>
                <span style={{ width: mu(24), height: mu(0.25), background: "#b7babf" }} />
                <span className="rounded-full bg-go" style={{ width: mu(1.8), height: mu(1.8) }} />
                <span style={{ width: mu(24), height: mu(0.25), background: "#b7babf" }} />
              </div>
            </div>

            {/* the statement */}
            <div className="absolute inset-x-0 text-center" style={{ top: mu(58), fontFamily: SERIF }}>
              <h2 className="font-semibold" style={{ fontSize: mu(12.5), letterSpacing: "-0.01em", lineHeight: 1 }}>
                Certificate of Membership
              </h2>
              <p className="italic text-ink2" style={{ fontSize: mu(4.6), marginTop: mu(7) }}>
                This is to certify that
              </p>
              <p className="mx-auto font-semibold" style={{ fontSize: mu(title.length > 34 ? 8.5 : 11), marginTop: mu(3), lineHeight: 1.05, maxWidth: mu(205) }}>
                {title}
              </p>
              <div className="mx-auto bg-ink" style={{ width: mu(150), height: mu(0.3), marginTop: mu(3.2) }} />
              <p className="mx-auto text-ink2" style={{ fontSize: mu(4.3), lineHeight: 1.5, width: mu(200), marginTop: mu(4.5) }}>
                has been admitted as {an} <b className="font-semibold text-ink">{typeName}</b> of the Global Robotics And Automation Society and is entitled to the rights and privileges of membership, subject to the Membership rules of the Society.
              </p>
              {details.length > 0 && (
                <p className="flex flex-wrap items-center justify-center font-medium" style={{ fontFamily: "var(--font-sans)", fontSize: mu(3.5), marginTop: mu(3.2), gap: mu(2.4) }}>
                  {details.map((d, i) => (
                    <span key={d} className="contents">
                      {i > 0 && <span className="inline-block rounded-full bg-go" style={{ width: mu(1.3), height: mu(1.3) }} />}
                      <span>{d}</span>
                    </span>
                  ))}
                </p>
              )}
            </div>

            {/* robot arm, bottom left */}
            <RobotArm sw={1.9} style={{ position: "absolute", left: mu(21), bottom: mu(19.6), width: mu(62) }} />

            {/* seal, centre */}
            <div className="absolute inset-x-0 text-center" style={{ bottom: mu(20) }}>
              <Seal id={`seal-cert-${m.id}`} style={{ width: mu(38), height: mu(38), display: "block", margin: "0 auto" }} />
              <p className="text-slate7" style={{ fontSize: mu(2.5), marginTop: mu(1.2) }}>
                Issued {shortDate(issued)}, digitally, by the Global Robotics And Automation Society
              </p>
            </div>

            {/* verify, bottom right */}
            <div className="absolute flex items-end" style={{ right: mu(25), bottom: mu(24), gap: mu(3) }}>
              <div className="text-right" style={{ paddingBottom: mu(0.6) }}>
                <p className="font-semibold" style={{ fontSize: mu(3) }}>
                  Scan to verify
                </p>
                <p style={{ ...k, marginTop: mu(0.6) }}>
                  or visit graas.org.in/verify
                  <br />
                  and enter the membership number
                </p>
              </div>
              <Qr value={url} size={240} style={{ width: mu(25), height: mu(25), display: "block", border: `${mu(0.25)} solid #e2e4e9` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Chapter certificate (A4 landscape), same frame as the member certificate ---------- */

export function ChapterCertificate({ c }: { c: any }) {
  const f = certFrame();
  const origin = typeof window === "undefined" ? "https://graas.org.in" : window.location.origin;
  const url = `${origin}/verify?id=${c.code}`;
  const branch = c.kind === "college" ? (c.branch === "Other" ? c.branch_other : c.branch) : null;
  const typeName = c.kind === "school" ? "School Chapter" : "College Chapter";
  const k = { fontSize: mu(2.35), color: "#5a616b" } as const;
  const v = { fontSize: mu(3.1) } as const;
  const title: string = c.institution ?? "";
  return (
    <div className="overflow-x-auto pb-2">
      <style>{"@media print { @page { size: A4 landscape; margin: 0; } }"}</style>
      <div className="print-area print-cert min-w-[720px]">
        <div style={{ containerType: "inline-size" }}>
          <div className="cert-sheet relative aspect-[297/210] w-full overflow-hidden bg-white text-ink shadow-[var(--shadow-card)] ring-1 ring-line">
            <svg viewBox="0 0 297 210" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              <path d={f.bg} fill="none" stroke={INK} strokeWidth="0.12" opacity="0.08" />
              <rect x="7" y="7" width="283" height="196" fill="none" stroke={INK} strokeWidth="0.6" />
              <path d={f.bands} fill="none" stroke="#5a616b" strokeWidth="0.22" />
              <rect x="16" y="16" width="265" height="178" fill="none" stroke={INK} strokeWidth="0.35" />
              <rect x="17.4" y="17.4" width="262.2" height="175.2" fill="none" stroke="#02ae3e" strokeWidth="0.3" />
              {[[11.5, 11.5], [285.5, 11.5], [11.5, 198.5], [285.5, 198.5]].map(([x, y]) => (
                <g key={`${x}-${y}`}>
                  <circle cx={x} cy={y} r="5" fill="#fff" stroke={INK} strokeWidth="0.35" />
                  <circle cx={x} cy={y} r="1" fill="#02ae3e" />
                </g>
              ))}
              <path d={f.corners} fill="none" stroke={INK} strokeWidth="0.18" />
            </svg>

            <div className="absolute bg-white" style={{ left: mu(25), top: mu(25), width: mu(54), border: `${mu(0.3)} solid ${INK}` }}>
              <div style={{ padding: `${mu(1.6)} ${mu(2.4)}`, borderBottom: `${mu(0.25)} solid #e2e4e9` }}>
                <p style={k}>Chapter number</p>
                <p className="readout font-medium" style={{ fontSize: mu(3.4) }}>
                  {c.code}
                </p>
              </div>
              <div className="grid grid-cols-2">
                <div style={{ padding: `${mu(1.6)} ${mu(2.4)}`, borderRight: `${mu(0.25)} solid #e2e4e9` }}>
                  <p style={k}>Valid from</p>
                  <p className="readout font-medium" style={v}>
                    {shortDate(c.approved_at)}
                  </p>
                </div>
                <div style={{ padding: `${mu(1.6)} ${mu(2.4)}` }}>
                  <p style={k}>Valid until</p>
                  <p className="readout font-medium" style={v}>
                    {c.valid_until ? shortDate(c.valid_until) : "No end date"}
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute flex items-center justify-center bg-white" style={{ right: mu(25), top: mu(22), width: mu(30), height: mu(33), border: `${mu(0.35)} solid ${INK}`, padding: mu(2) }}>
              <Seal id={`seal-chap-${c.id}`} ring={false} style={{ width: "100%", height: "auto", display: "block" }} />
            </div>

            <div className="absolute inset-x-0 text-center" style={{ top: mu(23) }}>
              <Lockup u={mu} scale={1.45} />
              <div className="flex items-center justify-center" style={{ gap: mu(2), marginTop: mu(4) }}>
                <span style={{ width: mu(24), height: mu(0.25), background: "#b7babf" }} />
                <span className="rounded-full bg-go" style={{ width: mu(1.8), height: mu(1.8) }} />
                <span style={{ width: mu(24), height: mu(0.25), background: "#b7babf" }} />
              </div>
            </div>

            <div className="absolute inset-x-0 text-center" style={{ top: mu(58), fontFamily: SERIF }}>
              <h2 className="font-semibold" style={{ fontSize: mu(12.5), letterSpacing: "-0.01em", lineHeight: 1 }}>
                Certificate of Membership
              </h2>
              <p className="italic text-ink2" style={{ fontSize: mu(4.6), marginTop: mu(7) }}>
                This is to certify that
              </p>
              <p className="mx-auto font-semibold" style={{ fontSize: mu(title.length > 40 ? 7.5 : title.length > 30 ? 9 : 11), marginTop: mu(3), lineHeight: 1.05, maxWidth: mu(205) }}>
                {title}
              </p>
              <div className="mx-auto bg-ink" style={{ width: mu(150), height: mu(0.3), marginTop: mu(3.2) }} />
              <p className="mx-auto text-ink2" style={{ fontSize: mu(4.3), lineHeight: 1.5, width: mu(205), marginTop: mu(4.5) }}>
                {branch ? (
                  <>
                    through its <b className="font-semibold text-ink">{branch}</b> department,{" "}
                  </>
                ) : null}
                has been admitted as a <b className="font-semibold text-ink">{typeName}</b> of the Global Robotics And Automation Society, with the rights and duties of a chapter under the Membership rules of the Society.
              </p>
              <p className="flex flex-wrap items-center justify-center font-medium" style={{ fontFamily: "var(--font-sans)", fontSize: mu(3.5), marginTop: mu(3.2), gap: mu(2.4) }}>
                <span>Coordinator: {c.head_name}{c.head_designation ? `, ${c.head_designation}` : ""}</span>
                {c.city && (
                  <>
                    <span className="inline-block rounded-full bg-go" style={{ width: mu(1.3), height: mu(1.3) }} />
                    <span>{c.city}{c.state && c.state !== "Outside India" ? `, ${c.state}` : ""}</span>
                  </>
                )}
              </p>
            </div>

            <RobotArm sw={1.9} style={{ position: "absolute", left: mu(21), bottom: mu(19.6), width: mu(62) }} />

            <div className="absolute inset-x-0 text-center" style={{ bottom: mu(20) }}>
              <Seal id={`seal-chapcert-${c.id}`} style={{ width: mu(38), height: mu(38), display: "block", margin: "0 auto" }} />
              <p className="text-slate7" style={{ fontSize: mu(2.5), marginTop: mu(1.2) }}>
                Issued {shortDate(c.approved_at)}, digitally, by the Global Robotics And Automation Society
              </p>
            </div>

            <div className="absolute flex items-end" style={{ right: mu(25), bottom: mu(24), gap: mu(3) }}>
              <div className="text-right" style={{ paddingBottom: mu(0.6) }}>
                <p className="font-semibold" style={{ fontSize: mu(3) }}>
                  Scan to verify
                </p>
                <p style={{ ...k, marginTop: mu(0.6) }}>
                  or visit graas.org.in/verify
                  <br />
                  and enter the chapter number
                </p>
              </div>
              <Qr value={url} size={240} style={{ width: mu(25), height: mu(25), display: "block", border: `${mu(0.25)} solid #e2e4e9` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
