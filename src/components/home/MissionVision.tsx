import Link from "next/link";
import { SectionHead } from "@/components/sections/Blocks";
import Reveal from "@/components/ui/Reveal";
import { MISSION, VISION } from "@/lib/site";

/** The logo's four rising bars and green dot, drawn small as a motif beside the mission. */
function Bars() {
  return (
    <svg viewBox="0 0 64 56" className="h-12 w-14" aria-hidden="true">
      <g className="bars-rise">
        <rect x="4" y="34" width="10" height="18" rx="1.5" fill="#b7babf" />
        <rect x="18" y="26" width="10" height="26" rx="1.5" fill="#8e919a" />
        <rect x="32" y="18" width="10" height="34" rx="1.5" fill="#5a616b" />
        <rect x="46" y="10" width="10" height="42" rx="1.5" fill="#000e21" />
        <circle className="bars-dot" cx="51" cy="4.5" r="4" fill="#02ae3e" />
      </g>
    </svg>
  );
}

/** A small world of connected points turning slowly: the vision's "connected global community". */
function Orbit() {
  const c = 110;
  const nodes = [0, 60, 130, 200, 255, 310].map((deg, i) => {
    const r = i % 2 ? 86 : 58;
    const a = (deg * Math.PI) / 180;
    return { x: c + r * Math.cos(a), y: c + r * Math.sin(a), green: i === 1 || i === 4 };
  });
  return (
    <svg viewBox="0 0 220 220" className="h-full w-full" aria-hidden="true">
      <circle cx={c} cy={c} r="86" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1" />
      <circle cx={c} cy={c} r="58" fill="none" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="1" />
      <ellipse cx={c} cy={c} rx="86" ry="34" fill="none" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="1" />
      <ellipse cx={c} cy={c} rx="34" ry="86" fill="none" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="1" />
      <g className="spin-slow">
        {nodes.map((n, i) => (
          <line key={"l" + i} x1={c} y1={c} x2={n.x} y2={n.y} stroke="#02ae3e" strokeOpacity="0.55" strokeWidth="1.2" className="flow" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
        {nodes.map((n, i) => (
          <circle key={"n" + i} cx={n.x} cy={n.y} r={n.green ? 5 : 4} fill={n.green ? "#02ae3e" : "#ffffff"} fillOpacity={n.green ? 1 : 0.85} />
        ))}
      </g>
      <circle cx={c} cy={c} r="9" fill="#02ae3e" />
      <circle cx={c} cy={c} r="16" fill="none" stroke="#02ae3e" strokeOpacity="0.4" strokeWidth="1.2" />
    </svg>
  );
}

/** Home: the society's official mission and vision, side by side. */
export default function MissionVision() {
  return (
    <section id="mission" className="section">
      <div className="shell">
        <SectionHead
          kicker="Mission and vision"
          title="Why GRAAS exists."
          action={
            <Link href="/about" className="btn btn-ghost">
              About GRAAS
            </Link>
          }
        />
        <div className="mt-7 grid overflow-hidden rounded-[28px] border border-line lg:grid-cols-2 lg:rounded-[40px]">
          <Reveal className="h-full">
            <article className="relative flex h-full flex-col bg-white p-7 sm:p-10 lg:p-14">
              <div className="flex items-start justify-between gap-6">
                <p className="flex items-center gap-2 text-sm font-semibold text-go-deep">
                  <span className="dot" aria-hidden="true" />
                  Our mission
                </p>
                <Bars />
              </div>
              <h3 className="h-section mt-3 !text-[clamp(1.7rem,1.2rem+1.6vw,2.6rem)]">{MISSION.title}</h3>
              <ol className="mt-6 grid gap-4">
                {MISSION.text.map((t, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="readout mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-go-soft text-sm text-go-deep">{`0${i + 1}`}</span>
                    <p className="text-[1.05rem] text-ink2">{t}</p>
                  </li>
                ))}
              </ol>
            </article>
          </Reveal>
          <Reveal delay={0.08} className="h-full">
            <article className="relative flex h-full flex-col overflow-hidden bg-ink p-7 text-white sm:p-10 lg:p-14">
              <div aria-hidden="true" className="grid-faint pointer-events-none absolute inset-0 opacity-[0.08] invert" />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 opacity-90 sm:h-72 sm:w-72 lg:-bottom-10 lg:-right-10">
                <Orbit />
              </div>
              <div className="relative">
                <p className="flex items-center gap-2 text-sm font-semibold text-go">
                  <span className="dot" aria-hidden="true" />
                  Our vision
                </p>
                <h3 className="h-section mt-3 !text-[clamp(1.7rem,1.2rem+1.6vw,2.6rem)]">{VISION.title}</h3>
                <p className="mt-6 max-w-[34rem] text-[1.15rem] leading-relaxed text-white/80 sm:text-[1.25rem]">{VISION.text}</p>
              </div>
              <div className="h-40 sm:h-32 lg:h-24" aria-hidden="true" />
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
