import type { CSSProperties } from "react";

/**
 * The GRAAS mark: four rising bars and the green dot, traced from the official logo.
 * `tone="light"` is for dark backgrounds, where the navy bar would disappear.
 */
/** The mark's shapes in its own coordinates (viewBox "80 38 382 340"), for use inside other drawings such as seals. */
export function LogoShapes({ tone = "dark", animate = false }: { tone?: "dark" | "light"; animate?: boolean }) {
  const fills = tone === "dark" ? ["#b7babf", "#8e919a", "#5a616b", "#000e21"] : ["rgba(255,255,255,.38)", "rgba(255,255,255,.58)", "rgba(255,255,255,.8)", "#ffffff"];
  const base = tone === "dark" ? "#010d21" : "#ffffff";
  return (
    <>
      <g className={animate ? "bars-rise" : undefined}>
        <path d="M114 364V279L139.5 246L165 279V364Z" fill={fills[0]} />
        <path d="M200 364V220L225 186L250 220V364Z" fill={fills[1]} />
        <path d="M284 364V167L309.5 132L335 167V364Z" fill={fills[2]} />
        <path d="M372 364V123L397.5 89L423 123V364Z" fill={fills[3]} />
        <circle className="bars-dot" cx="397" cy="64" r="18.5" fill="#02ae3e" />
      </g>
      <rect x="87" y="364" width="368" height="7" rx="3.5" fill={base} />
    </>
  );
}

export function LogoMark({ size = 36, tone = "dark", animate = false, className = "", style }: { size?: number; tone?: "dark" | "light"; animate?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={(size * 340) / 382} viewBox="80 38 382 340" className={className} style={style} aria-hidden="true">
      <LogoShapes tone={tone} animate={animate} />
    </svg>
  );
}

/** How the mark and the name sit together. "short" is the mark with GRAAS only. */
export type Lockup = "short" | "stack" | "split" | "name";
/** The lockup used in the site header (and wherever `brand` is asked for). Chosen by Sagar. */
export const BRAND_LOCKUP: Lockup = "stack";

export default function Logo({ tone = "dark", full = false, lockup, brand = false }: { tone?: "dark" | "light"; full?: boolean; lockup?: Lockup; brand?: boolean }) {
  const v: Lockup = lockup ?? (brand ? BRAND_LOCKUP : full ? "stack" : "short");
  const ink = tone === "light" ? "text-white" : "text-ink";
  const sub = tone === "light" ? "text-white/75" : "text-slate7";
  if (v === "split")
    return (
      <span className="inline-flex items-center gap-2.5">
        <LogoMark size={44} tone={tone} />
        <span className={`text-[1.45rem] font-bold tracking-[0.04em] ${ink}`}>GRAAS</span>
        <span className={`h-9 w-px ${tone === "light" ? "bg-white/30" : "bg-line"}`} aria-hidden="true" />
        <span className={`flex flex-col text-[0.7rem] font-semibold leading-[1.2] sm:text-[0.76rem] ${sub}`}>
          <span>Global Robotics And</span>
          <span>Automation Society</span>
        </span>
      </span>
    );
  if (v === "name")
    return (
      <span className="inline-flex items-center gap-2.5">
        <LogoMark size={44} tone={tone} />
        <span className="flex flex-col">
          <span className={`text-[0.9rem] font-bold leading-[1.15] sm:text-[1rem] ${ink}`}>
            Global Robotics And
            <br />
            Automation Society
          </span>
          <span className={`mt-0.5 text-[0.66rem] font-semibold tracking-[0.22em] ${tone === "light" ? "text-[#7fe0a0]" : "text-go-deep"}`}>GRAAS</span>
        </span>
      </span>
    );
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={46} tone={tone} />
      <span className="flex flex-col leading-none">
        <span className={`text-[1.5rem] font-bold tracking-[0.04em] ${ink}`}>GRAAS</span>
        {v === "stack" && <span className={`mt-1 text-[0.62rem] font-medium tracking-wide sm:text-[0.7rem] ${sub}`}>Global Robotics And Automation Society</span>}
      </span>
    </span>
  );
}
