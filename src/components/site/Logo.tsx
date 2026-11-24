import type { CSSProperties } from "react";

/**
 * The GRAAS mark: four rising bars and the green dot, traced from the official logo.
 * `tone="light"` is for dark backgrounds, where the navy bar would disappear.
 */
export function LogoMark({ size = 36, tone = "dark", animate = false, className = "", style }: { size?: number; tone?: "dark" | "light"; animate?: boolean; className?: string; style?: CSSProperties }) {
  const fills = tone === "dark" ? ["#b7babf", "#8e919a", "#5a616b", "#000e21"] : ["rgba(255,255,255,.38)", "rgba(255,255,255,.58)", "rgba(255,255,255,.8)", "#ffffff"];
  const base = tone === "dark" ? "#010d21" : "#ffffff";
  return (
    <svg width={size} height={(size * 340) / 382} viewBox="80 38 382 340" className={className} style={style} aria-hidden="true">
      <g className={animate ? "bars-rise" : undefined}>
        <path d="M114 364V279L139.5 246L165 279V364Z" fill={fills[0]} />
        <path d="M200 364V220L225 186L250 220V364Z" fill={fills[1]} />
        <path d="M284 364V167L309.5 132L335 167V364Z" fill={fills[2]} />
        <path d="M372 364V123L397.5 89L423 123V364Z" fill={fills[3]} />
        <circle className="bars-dot" cx="397" cy="64" r="18.5" fill="#02ae3e" />
      </g>
      <rect x="87" y="364" width="368" height="7" rx="3.5" fill={base} />
    </svg>
  );
}

export default function Logo({ tone = "dark", full = false }: { tone?: "dark" | "light"; full?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={46} tone={tone} />
      <span className="flex flex-col leading-none">
        <span className={`text-[1.5rem] font-bold tracking-[0.04em] ${tone === "light" ? "text-white" : "text-ink"}`}>GRAAS</span>
        {full && <span className={`mt-1 text-[0.7rem] font-medium tracking-wide ${tone === "light" ? "text-white/70" : "text-slate7"}`}>Global Robotics And Automation Society</span>}
      </span>
    </span>
  );
}
