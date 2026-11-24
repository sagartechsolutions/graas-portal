"use client";

import { motion, useScroll, useTransform } from "motion/react";

function gearPath(teeth: number, ro: number, ri: number) {
  const step = (Math.PI * 2) / teeth;
  let d = "";
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts: [number, number][] = [
      [ri, a - step * 0.3],
      [ro, a - step * 0.16],
      [ro, a + step * 0.16],
      [ri, a + step * 0.3],
    ];
    pts.forEach(([r, ang], k) => {
      d += `${i === 0 && k === 0 ? "M" : "L"}${(Math.cos(ang) * r).toFixed(2)} ${(Math.sin(ang) * r).toFixed(2)} `;
    });
  }
  return d + "Z";
}

const BIG = gearPath(12, 50, 39);
const SMALL = gearPath(8, 34, 24.5);

/** Two meshed gears that turn as the page scrolls. Ratio 12:8, so the small one spins 1.5× the other way. */
export default function Gears({ className = "" }: { className?: string }) {
  const { scrollY } = useScroll();
  const a = useTransform(scrollY, (v) => v * 0.22);
  const b = useTransform(scrollY, (v) => -v * 0.33 + 22.5);
  return (
    <svg width="190" height="120" viewBox="0 0 190 120" className={className} aria-hidden="true">
      <motion.g style={{ rotate: a, transformOrigin: "60px 60px", transformBox: "view-box" }}>
        <g transform="translate(60 60)">
          <path d={BIG} fill="#e7ebff" stroke="#0c1330" strokeWidth="2.5" strokeLinejoin="round" />
          <circle r="14" fill="#fff" stroke="#0c1330" strokeWidth="2.5" />
        </g>
      </motion.g>
      <motion.g style={{ rotate: b, transformOrigin: "132px 74px", transformBox: "view-box" }}>
        <g transform="translate(132 74)">
          <path d={SMALL} fill="#ff5b1a" stroke="#0c1330" strokeWidth="2.5" strokeLinejoin="round" />
          <circle r="9" fill="#fff" stroke="#0c1330" strokeWidth="2.5" />
        </g>
      </motion.g>
    </svg>
  );
}
