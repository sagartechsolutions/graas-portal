"use client";

import { useRef } from "react";
import Logo, { LogoMark } from "@/components/site/Logo";

// A fixed, decorative QR-style pattern. It is not a real code.
const QR = [
  "111111101",
  "100000101",
  "101110100",
  "101110111",
  "100000100",
  "111111101",
  "001010011",
  "110100101",
  "101011011",
];

export function QrGlyph({ size = 64, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 9 9" aria-hidden="true" shapeRendering="crispEdges">
      {QR.flatMap((row, y) => row.split("").map((c, x) => (c === "1" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={color} /> : null)))}
    </svg>
  );
}

/** The digital member ID. Leans toward the pointer and catches the light, like a card held in the hand. */
export default function MemberCard({
  name = "Your name",
  role = "Student member",
  idLabel = "Member ID",
  idText = "Issued when you join",
  badge = "Verified member",
  className = "",
}: {
  name?: string;
  role?: string;
  idLabel?: string;
  idText?: string;
  badge?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function move(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const b = el.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
    el.style.transform = `perspective(900px) rotateX(${((0.5 - y) * 10).toFixed(2)}deg) rotateY(${((x - 0.5) * 12).toFixed(2)}deg)`;
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  }
  function leave() {
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      className={`@container relative aspect-[1.586] w-full overflow-hidden rounded-[22px] bg-ink text-white shadow-[var(--shadow-lift)] transition-transform duration-300 ease-out will-change-transform ${className}`}
    >
      <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(380px circle at var(--mx, 78%) var(--my, 8%), rgba(255,255,255,0.17), transparent 58%)" }} />
      <LogoMark size={230} tone="light" className="absolute -bottom-10 -right-8 opacity-[0.06]" />
      <div className="relative flex h-full flex-col justify-between p-[7%]">
        <div className="flex items-start justify-between">
          <span className="origin-top-left scale-[0.82]">
            <Logo tone="light" brand />
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/10 px-2.5 py-1 text-[0.7rem] font-medium">
            <span className="dot" /> {badge}
          </span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-[clamp(1.05rem,4.6cqw,1.45rem)] font-semibold leading-tight tracking-tight">{name}</p>
            <p className="mt-0.5 text-sm text-white/65">{role}</p>
            <p className="readout mt-3 text-[0.7rem] text-white/50">{idLabel}</p>
            <p className="readout text-[0.8rem] text-white/85">{idText}</p>
          </div>
          <div className="shrink-0 rounded-lg bg-white/10 p-2">
            <QrGlyph size={54} />
          </div>
        </div>
      </div>
    </div>
  );
}
