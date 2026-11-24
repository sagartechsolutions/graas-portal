"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CSSProperties } from "react";
import { LogoMark } from "@/components/site/Logo";
import { shortDate } from "@/lib/money";
import { describe, initials, isIndividual, usePhoto } from "./Details";
import Qr from "./Qr";

/*
 * Member ID and certificate. Both are drawn from the member's current profile and membership type,
 * so a change of details or type shows at once. Sizes use container units, so the same design
 * prints at true size: the ID at 85.6 x 54 mm (a bank-card size) and the certificate on A4 landscape.
 */

const AUD_NAME: Record<string, string> = { student: "Student member", professional: "Professional member", institution: "Institution member", industry: "Industry member" };
const AUD_ORDER = ["student", "professional", "institution", "industry"];
const BAR_TONE = ["#b7babf", "#8e919a", "#5a616b", "#000e21"];

/** The four logo bars, one per membership type; the member's own bar is solid, with the green dot above it. */
function TypeBars({ audience, h, light = false }: { audience: string; h: string; light?: boolean }) {
  const idx = Math.max(0, AUD_ORDER.indexOf(audience));
  return (
    <svg viewBox="0 0 40 34" style={{ height: h, width: "auto" }} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => {
        const bh = 12 + i * 5.5;
        const on = i === idx;
        return <rect key={i} x={i * 10 + 1} y={34 - bh} width={7} height={bh} rx={1} fill={on ? (light ? "#ffffff" : "#000e21") : light ? "rgba(255,255,255,.28)" : "#d9dce1"} />;
      })}
      <circle cx={idx * 10 + 4.5} cy={34 - (12 + idx * 5.5) - 4.2} r={2.6} fill="#02ae3e" />
    </svg>
  );
}

function Portrait({ url, name, org, style }: { url: string | null; name: string; org: boolean; style: CSSProperties }) {
  return (
    <div className="relative shrink-0 overflow-hidden bg-mist" style={style}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className={`h-full w-full ${org ? "bg-white object-contain p-[6%]" : "object-cover"}`} />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-semibold text-slate5" style={{ fontSize: "38%" }}>
          <span style={{ fontSize: "inherit" }}>{initials(name)}</span>
        </span>
      )}
    </div>
  );
}

const cq = (n: number) => `${n}cqw`;

type DocProps = { a: any; org?: any };

function useDocData({ a }: DocProps) {
  const m = a.membership, p = a.profile;
  const audience: string = m.plan.audience;
  const isOrg = !isIndividual(audience);
  const title = isOrg ? p.organisation || m.organisation || p.full_name : p.full_name;
  const rows = describe(p, audience);
  const origin = typeof window === "undefined" ? "https://graas.org.in" : window.location.origin;
  const url = `${origin}/verify?id=${m.member_no}`;
  const photo = usePhoto(p.id, p.photo_updated_at);
  return { m, p, audience, isOrg, title, rows, url, photo, host: origin.replace(/^https?:\/\//, "") };
}

/* ───────────── Member ID: front ───────────── */
export function IdFront(props: DocProps) {
  const { m, audience, isOrg, title, rows, photo } = useDocData(props);
  const shown = rows.filter((r) => r.label !== "City").slice(0, 3);
  return (
    <div className="id-side w-full" style={{ containerType: "inline-size" }}>
      <div className="relative aspect-[85.6/54] w-full overflow-hidden bg-white text-ink ring-1 ring-line" style={{ borderRadius: cq(4.4) }}>
        {/* header */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between" style={{ padding: `${cq(4.2)} ${cq(5.2)} 0` }}>
          <div className="flex items-center" style={{ gap: cq(2) }}>
            <LogoMark size={40} style={{ width: cq(8.6), height: "auto" }} />
            <div className="leading-none">
              <p className="font-bold tracking-[0.04em]" style={{ fontSize: cq(4.6) }}>
                GRAAS
              </p>
              <p className="font-medium text-slate7" style={{ fontSize: cq(1.85), marginTop: cq(0.9) }}>
                Global Robotics And Automation Society
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end leading-none">
            <p className="font-semibold" style={{ fontSize: cq(2.3) }}>
              Member ID
            </p>
            <p className="readout text-slate7" style={{ fontSize: cq(1.7), marginTop: cq(0.9) }}>
              graas.org.in
            </p>
          </div>
        </div>
        <div className="absolute inset-x-0 bg-line" style={{ top: cq(14.8), height: "1px", marginInline: cq(5.2) }} />

        {/* body */}
        <div className="absolute inset-x-0 flex" style={{ top: cq(18.2), paddingInline: cq(5.2), gap: cq(4) }}>
          <Portrait url={photo} name={title} org={isOrg} style={{ width: cq(23), height: cq(28.5), borderRadius: cq(2.2), fontSize: cq(23) }} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-[1.08] tracking-[-0.02em]" style={{ fontSize: cq(title.length > 26 ? 4.3 : 5.2), display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {title}
            </p>
            <p className="flex items-center font-semibold text-go-deep" style={{ fontSize: cq(2.25), gap: cq(1.2), marginTop: cq(1.4) }}>
              <TypeBars audience={audience} h={cq(2.9)} />
              {AUD_NAME[audience] ?? m.plan.name}
            </p>
            <dl className="grid" style={{ marginTop: cq(1.6), rowGap: cq(0.7), paddingRight: cq(13) }}>
              {shown.map((r) => (
                <div key={r.label} className="flex min-w-0 items-baseline" style={{ gap: cq(1.6) }}>
                  <dt className="shrink-0 whitespace-nowrap text-slate7" style={{ fontSize: cq(1.8), width: cq(11.5) }}>
                    {r.label === "Represented by" ? "Contact" : r.label}
                  </dt>
                  <dd className="truncate font-medium" style={{ fontSize: cq(2.3) }}>
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* the logo bars stand on the card's baseline */}
        <div className="absolute flex items-end" style={{ right: cq(5.2), bottom: cq(11.5), gap: cq(1.1) }} aria-hidden="true">
          {BAR_TONE.map((c, i) => (
            <span key={c} className="relative block" style={{ width: cq(2.2), height: cq(3.4 + i * 2.1), background: c, borderRadius: `${cq(0.5)} ${cq(0.5)} 0 0` }}>
              {i === 3 && <span className="absolute left-1/2 block -translate-x-1/2 rounded-full bg-go" style={{ width: cq(1.7), height: cq(1.7), top: cq(-2.6) }} />}
            </span>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink text-white" style={{ height: cq(11.5), paddingInline: cq(5.2) }}>
          <div className="leading-none">
            <p className="text-white/60" style={{ fontSize: cq(1.6) }}>
              Member number
            </p>
            <p className="readout font-medium tracking-[0.02em]" style={{ fontSize: cq(3.3), marginTop: cq(0.8) }}>
              {m.member_no}
            </p>
          </div>
          <div className="text-right leading-none">
            <p className="text-white/60" style={{ fontSize: cq(1.6) }}>
              Valid until
            </p>
            <p className="readout font-medium" style={{ fontSize: cq(2.7), marginTop: cq(0.8) }}>
              {m.ends_on ? shortDate(m.ends_on) : "No end date"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Member ID: back ───────────── */
export function IdBack(props: DocProps) {
  const { m, p, url, host } = useDocData(props);
  const org = props.org ?? {};
  const contact = [org.email, org.phone].filter(Boolean).join(", ");
  const guardian = p.guardian_name && p.guardian_phone ? `${p.guardian_name}, +91 ${p.guardian_phone}` : null;
  return (
    <div className="id-side w-full" style={{ containerType: "inline-size" }}>
      <div className="relative aspect-[85.6/54] w-full overflow-hidden bg-ink text-white" style={{ borderRadius: cq(4.4) }}>
        <LogoMark tone="light" size={200} className="pointer-events-none absolute opacity-[0.07]" style={{ width: cq(46), height: "auto", right: cq(-6), top: cq(-4) }} />
        <div className="absolute flex items-center justify-center bg-white" style={{ left: cq(5.2), top: cq(5.2), width: cq(31), height: cq(31), borderRadius: cq(2.6) }}>
          <Qr value={url} size={180} style={{ width: "88%", height: "88%" }} />
        </div>
        <div className="absolute" style={{ left: cq(41), right: cq(5.2), top: cq(5.6) }}>
          <p className="font-semibold leading-tight" style={{ fontSize: cq(3.4) }}>
            Scan to check this membership
          </p>
          <p className="text-white/70" style={{ fontSize: cq(2.05), marginTop: cq(1.2), lineHeight: 1.35 }}>
            Or open {host}/verify and enter the member number.
          </p>
          <p className="readout font-medium" style={{ fontSize: cq(3.1), marginTop: cq(2.4) }}>
            {m.member_no}
          </p>
          <p className="readout text-white/60" style={{ fontSize: cq(1.8), marginTop: cq(0.8) }}>
            Member since {shortDate(m.starts_on)}
          </p>
          {guardian && (
            <div style={{ marginTop: cq(2.4) }}>
              <p className="text-white/60" style={{ fontSize: cq(1.6) }}>
                Parent or guardian
              </p>
              <p className="font-medium" style={{ fontSize: cq(2.1), marginTop: cq(0.5) }}>
                {guardian}
              </p>
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-white/12 bg-white/[0.06]" style={{ padding: `${cq(2.2)} ${cq(5.2)}` }}>
          <p className="text-white/70" style={{ fontSize: cq(1.75), lineHeight: 1.4 }}>
            This card belongs to the Global Robotics And Automation Society and is valid only with a current membership.
            {contact ? ` If found, please return it to GRAAS: ${contact}.` : " If found, please return it to GRAAS."}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Both sides, side by side on wide screens and stacked on phones. Prints at true card size with cutting guides. */
export function IdCards(props: DocProps) {
  return (
    <div className="print-area print-id grid gap-6 md:grid-cols-2">
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

/* ───────────── Certificate ───────────── */

/** The drawing-sheet frame: border, zone numbers 1–8 and letters A–F, and centring marks. Units are millimetres. */
function SheetFrame() {
  const W = 297, H = 210, o = 6, i = 13;
  const zx = (W - 2 * i) / 8, zy = (H - 2 * i) / 6;
  const t = { fontFamily: "var(--font-mono)", fontSize: 2.5, fill: "#8e919a" } as const;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <rect x={o} y={o} width={W - 2 * o} height={H - 2 * o} fill="none" stroke="#000e21" strokeWidth={0.3} />
      <rect x={i} y={i} width={W - 2 * i} height={H - 2 * i} fill="none" stroke="#000e21" strokeWidth={0.8} />
      {Array.from({ length: 7 }, (_, k) => i + (k + 1) * zx).map((x) => (
        <g key={x} stroke="#000e21" strokeWidth={0.25}>
          <line x1={x} y1={o} x2={x} y2={i} />
          <line x1={x} y1={H - i} x2={x} y2={H - o} />
        </g>
      ))}
      {Array.from({ length: 5 }, (_, k) => i + (k + 1) * zy).map((y) => (
        <g key={y} stroke="#000e21" strokeWidth={0.25}>
          <line x1={o} y1={y} x2={i} y2={y} />
          <line x1={W - i} y1={y} x2={W - o} y2={y} />
        </g>
      ))}
      {Array.from({ length: 8 }, (_, k) => (
        <g key={k} {...t} textAnchor="middle">
          <text x={i + (k + 0.5) * zx} y={10.6}>
            {k + 1}
          </text>
          <text x={i + (k + 0.5) * zx} y={H - 8.1}>
            {k + 1}
          </text>
        </g>
      ))}
      {"ABCDEF".split("").map((L, k) => (
        <g key={L} {...t} textAnchor="middle">
          <text x={9.5} y={i + (k + 0.5) * zy + 0.9}>
            {L}
          </text>
          <text x={W - 9.5} y={i + (k + 0.5) * zy + 0.9}>
            {L}
          </text>
        </g>
      ))}
      <g stroke="#000e21" strokeWidth={0.8}>
        <line x1={W / 2} y1={o} x2={W / 2} y2={i + 3} />
        <line x1={W / 2} y1={H - i - 3} x2={W / 2} y2={H - o} />
        <line x1={o} y1={H / 2} x2={i + 3} y2={H / 2} />
        <line x1={W - i - 3} y1={H / 2} x2={W - o} y2={H / 2} />
      </g>
    </svg>
  );
}

/** A round seal: the GRAAS mark inside a ring of lettering. */
function Seal({ size }: { size: string }) {
  const ring = "Global Robotics And Automation Society • Member • ";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <defs>
          <path id="seal-ring" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <circle cx="50" cy="50" r="48" fill="none" stroke="#000e21" strokeWidth="1.2" />
        <circle cx="50" cy="50" r="45.5" fill="none" stroke="#000e21" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="#000e21" strokeWidth="0.4" />
        <text fontSize="6.2" fontWeight="600" fill="#000e21" style={{ fontFamily: "var(--font-sans)" }}>
          <textPath href="#seal-ring" startOffset="0" textLength="236" lengthAdjust="spacing">
            {ring}
          </textPath>
        </text>
      </svg>
      <div className="absolute inset-[31%] flex items-center justify-center">
        <LogoMark size={60} style={{ width: "100%", height: "auto" }} />
      </div>
    </div>
  );
}

const mm = (v: number) => `${((v * 100) / 297).toFixed(3)}cqw`;

export function Certificate(props: DocProps) {
  const { m, audience, isOrg, title, rows, url, photo } = useDocData(props);
  const issued = m.activated_at ?? m.starts_on;
  const detail = rows
    .filter((r) => r.label !== "City" && !(isOrg && r.label === "Represented by"))
    .map((r) => r.value)
    .join(", ");
  const rep = isOrg ? rows.find((r) => r.label === "Represented by")?.value : null;
  const cell = "absolute border-ink";
  const lab = { fontSize: mm(2.3) } as const;
  return (
    <div className="overflow-x-auto pb-2">
      {/* Only while the certificate is on screen: print it on A4 landscape, edge to edge. */}
      <style>{"@media print { @page { size: A4 landscape; margin: 0; } }"}</style>
      <div className="print-area print-cert min-w-[680px]">
        <div style={{ containerType: "inline-size" }}>
          <div className="cert-sheet relative aspect-[297/210] w-full overflow-hidden bg-white text-ink shadow-[var(--shadow-card)] ring-1 ring-line">
            <SheetFrame />

            {/* society, top left */}
            <div className="absolute flex items-center" style={{ left: mm(22), top: mm(21), gap: mm(3.5) }}>
              <LogoMark size={60} style={{ width: mm(15), height: "auto" }} />
              <div className="leading-none">
                <p className="font-bold tracking-[0.04em]" style={{ fontSize: mm(7) }}>
                  GRAAS
                </p>
                <p className="font-medium text-slate7" style={{ fontSize: mm(3), marginTop: mm(1.4) }}>
                  Global Robotics And Automation Society
                </p>
              </div>
            </div>

            {/* photo or logo, top right */}
            <div className="absolute border-ink" style={{ right: mm(22), top: mm(21), width: mm(34), height: mm(40), borderWidth: mm(0.35), padding: mm(1.3) }}>
              <Portrait url={photo} name={title} org={isOrg} style={{ width: "100%", height: "100%", fontSize: mm(30) }} />
            </div>

            {/* the statement */}
            <div className="absolute" style={{ left: mm(22), top: mm(58), width: mm(205) }}>
              <h2 className="font-semibold leading-none tracking-[-0.025em]" style={{ fontSize: mm(11.5) }}>
                Certificate of Membership
              </h2>
              <p className="text-ink2" style={{ fontSize: mm(4), marginTop: mm(9) }}>
                This certifies that
              </p>
              <p className="font-semibold leading-[1.05] tracking-[-0.025em]" style={{ fontSize: mm(title.length > 30 ? 10 : 12.5), marginTop: mm(2.5) }}>
                {title}
              </p>
              <div className="flex items-center" style={{ marginTop: mm(3), gap: mm(1.5), width: mm(150) }} aria-hidden="true">
                <span className="block bg-ink" style={{ width: mm(0.35), height: mm(3) }} />
                <span className="block flex-1 bg-ink" style={{ height: mm(0.25) }} />
                <span className="block bg-ink" style={{ width: mm(0.35), height: mm(3) }} />
              </div>
              <p className="text-ink2" style={{ fontSize: mm(4.2), marginTop: mm(4), lineHeight: 1.45, maxWidth: mm(196) }}>
                is {audience === "industry" || audience === "institution" ? "an" : "a"} <strong className="font-semibold text-ink">{AUD_NAME[audience] ?? `${m.plan.name} member`}</strong> of the Global Robotics And Automation Society, entitled to
                the benefits of membership set out in its Membership rules for the period shown below.
              </p>
              {(detail || rep) && (
                <p className="font-medium" style={{ fontSize: mm(3.9), marginTop: mm(2.5) }}>
                  {rep ? `Represented by ${rep}` : detail}
                </p>
              )}
            </div>

            {/* seal and note, bottom left */}
            <div className="absolute flex items-center" style={{ left: mm(22), bottom: mm(21), gap: mm(5) }}>
              <Seal size={mm(30)} />
              <p className="text-ink2" style={{ fontSize: mm(2.7), lineHeight: 1.45, width: mm(62) }}>
                Issued digitally by GRAAS. It needs no signature: scan the code in the title block, or visit graas.org.in/verify, to confirm that this membership is current.
              </p>
            </div>

            {/* title block, bottom right, joined to the border as on a drawing sheet */}
            <div className="absolute border-ink" style={{ right: mm(13), bottom: mm(13), width: mm(132), height: mm(42), borderLeftWidth: mm(0.8), borderTopWidth: mm(0.8) }}>
              <div className={cell} style={{ left: 0, top: 0, width: mm(92), height: mm(14), borderBottomWidth: mm(0.25), padding: `${mm(1.8)} ${mm(2.5)}` }}>
                <p className="text-slate7" style={lab}>
                  Member number
                </p>
                <p className="readout font-medium tracking-[0.02em]" style={{ fontSize: mm(5.2), marginTop: mm(0.6) }}>
                  {m.member_no}
                </p>
              </div>
              {[
                ["Membership", m.plan.name, 0, 14],
                ["Issued on", shortDate(issued), 46, 14],
                ["Valid from", shortDate(m.starts_on), 0, 28],
                ["Valid until", m.ends_on ? shortDate(m.ends_on) : "No end date", 46, 28],
              ].map(([k, v, x, y]) => (
                <div key={k as string} className={cell} style={{ left: mm(x as number), top: mm(y as number), width: mm(46), height: mm(14), borderBottomWidth: y === 14 ? mm(0.25) : 0, borderRightWidth: x === 0 ? mm(0.25) : 0, padding: `${mm(1.8)} ${mm(2.5)}` }}>
                  <p className="text-slate7" style={lab}>
                    {k}
                  </p>
                  <p className={`${k === "Membership" ? "" : "readout"} truncate font-semibold`} style={{ fontSize: mm(3.6), marginTop: mm(0.8) }}>
                    {v}
                  </p>
                </div>
              ))}
              <div className={`${cell} flex flex-col items-center justify-center`} style={{ left: mm(92), top: 0, width: mm(40), height: mm(42), borderLeftWidth: mm(0.25), gap: mm(0.8) }}>
                <Qr value={url} size={200} style={{ width: mm(31), height: mm(31) }} />
                <p className="text-slate7" style={{ fontSize: mm(2.1) }}>
                  Scan to verify
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
