"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { QrGlyph } from "./MemberCard";

/** Classmates linking up into one chapter. Plays once when it scrolls into view. */
export function ChapterGraph() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const c = { x: 150, y: 96 };
  const nodes = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    return { x: c.x + Math.cos(a) * 118 * (i % 2 ? 0.84 : 1), y: c.y + Math.sin(a) * 72 * (i % 2 ? 1 : 0.9) };
  });
  return (
    <svg ref={ref} viewBox="0 0 300 192" className="h-full w-full" role="img" aria-label="Eight classmates connecting to form one chapter">
      {nodes.map((n, i) => (
        <motion.line key={i} x1={n.x} y1={n.y} x2={c.x} y2={c.y} stroke="#b7babf" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : {}} transition={{ duration: 0.5, delay: 0.15 + i * 0.1, ease: "easeOut" }} />
      ))}
      {nodes.map((n, i) => (
        <motion.circle
          key={i}
          cx={n.x}
          cy={n.y}
          r="9"
          fill="#fff"
          stroke={["#b7babf", "#8e919a", "#5a616b", "#000e21"][i % 4]}
          strokeWidth="2.5"
          initial={{ scale: 0 }}
          animate={inView ? { scale: 1 } : {}}
          transition={{ type: "spring", stiffness: 300, damping: 18, delay: i * 0.1 }}
          style={{ transformOrigin: `${n.x}px ${n.y}px` }}
        />
      ))}
      <motion.g initial={{ scale: 0.4, opacity: 0 }} animate={inView ? { scale: 1, opacity: 1 } : {}} transition={{ type: "spring", stiffness: 220, damping: 14, delay: 1.05 }} style={{ transformOrigin: `${c.x}px ${c.y}px` }}>
        <circle cx={c.x} cy={c.y} r="34" fill="#000e21" />
        <text x={c.x} y={c.y - 2} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#fff">
          Your
        </text>
        <text x={c.x} y={c.y + 11} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#fff">
          chapter
        </text>
        <circle cx={c.x + 25} cy={c.y - 25} r="6" fill="#02ae3e" stroke="#fff" strokeWidth="2" />
      </motion.g>
    </svg>
  );
}

/** A member ID being checked: the scan line passes, then the result shows. */
export function VerifyScan() {
  const reduce = useReducedMotion();
  return (
    <div className="flex h-full items-center justify-center gap-5">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-card)]">
        <QrGlyph size={104} color="#000e21" />
        {!reduce && <span aria-hidden="true" className="absolute inset-x-0 top-0 block h-full" style={{ animation: "scan 3.2s ease-in-out infinite" }}><span className="block h-0.5 w-full bg-go shadow-[0_0_14px_2px_rgb(2_174_62/0.55)]" /></span>}
      </div>
      <div>
        <p className="chip !border-transparent !bg-go-soft !text-go-deep">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2.5 7.5 5.8 10.5 11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Verified
        </p>
        <p className="mt-3 text-sm font-semibold">Active member</p>
        <p className="text-sm text-ink2">Checked by scanning the ID</p>
      </div>
    </div>
  );
}

const PROBLEMS = [
  { field: "Machine vision", title: "Check machined parts with a camera instead of by eye" },
  { field: "Mobile robots", title: "Move bins between two lines without a forklift" },
  { field: "IoT and PLC", title: "Get cycle data out of a twenty-year-old press" },
];

/** Sample problem briefs, turning over like cards on a board. */
export function ProblemCards() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((v) => (v + 1) % PROBLEMS.length), 3600);
    return () => clearInterval(id);
  }, [reduce]);
  const p = PROBLEMS[i];
  return (
    <div className="relative h-[6.6rem] w-full max-w-[19rem]">
      <div aria-hidden="true" className="absolute inset-x-3 top-2.5 h-full rounded-2xl bg-white/50" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={i} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0 rounded-2xl bg-white p-4 shadow-[var(--shadow-lift)]">
          <p className="text-xs font-semibold text-go-deep">{p.field}</p>
          <p className="mt-1 text-[0.95rem] font-semibold leading-snug text-ink">{p.title}</p>
        </motion.div>
      </AnimatePresence>
      <p className="sr-only">Examples of the kind of problem companies will post.</p>
    </div>
  );
}

/** A certificate with its seal stamped on as it comes into view. */
export function CertificateArt() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  return (
    <div ref={ref} className="flex h-full items-center justify-center">
      <div className="relative w-[78%] max-w-[17rem] rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="h-2 w-16 rounded-full bg-ink" />
        <div className="mt-4 h-1.5 w-full rounded-full bg-line" />
        <div className="mt-2 h-1.5 w-4/5 rounded-full bg-line" />
        <div className="mt-2 h-1.5 w-3/5 rounded-full bg-line" />
        <div className="mt-5 flex items-end justify-between">
          <div>
            <div className="h-1.5 w-20 rounded-full bg-slate3" />
            <div className="mt-1.5 h-1.5 w-12 rounded-full bg-line" />
          </div>
          <QrGlyph size={34} color="#000e21" />
        </div>
        <motion.div
          aria-hidden="true"
          className="absolute -right-4 -top-4 flex h-14 w-14 items-center justify-center rounded-full bg-go text-ink shadow-[0_8px_20px_-6px_rgb(2_174_62/0.7)]"
          initial={{ scale: 2.2, opacity: 0, rotate: -30 }}
          animate={inView ? { scale: 1, opacity: 1, rotate: 0 } : {}}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.35 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M5 12.5 10 17.5 19.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}
