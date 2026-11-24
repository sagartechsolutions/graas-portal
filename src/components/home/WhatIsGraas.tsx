import Link from "next/link";
import { LogoShapes } from "@/components/site/Logo";
import { iconPath } from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";

const NODES = [
  { label: "Schools", sub: "Class 1 to 12", icon: "school" },
  { label: "Students", sub: "Diploma to PhD", icon: "learn" },
  { label: "Professionals", sub: "Engineers, faculty", icon: "mic" },
  { label: "Industry", sub: "Companies", icon: "factory" },
  { label: "Institutions", sub: "Colleges", icon: "college" },
];

const PILLARS = [
  { n: "01", title: "Learn", text: "Live lectures, courses with projects, and sessions led by engineers and faculty. From a first circuit to PLCs, ROS and machine vision." },
  { n: "02", title: "Build", text: "Chapters in colleges and schools, hands-on workshops and team projects. Robots are made, not only read about." },
  { n: "03", title: "Compete", text: "Robot challenges, hackathons and inter-college competitions, with results and certificates anyone can verify." },
  { n: "04", title: "Connect", text: "Companies post real problems, jobs and internships. Members meet the people who will hire them, and the people they will hire." },
];

/** The network diagram: GRAAS in the middle, the five groups it connects around it, signals moving between them. */
function Network() {
  const cx = 280, cy = 270, R = 190;
  const pts = NODES.map((n, i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    return { ...n, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });
  return (
    <svg viewBox="0 0 560 560" className="h-auto w-full" role="img" aria-label="GRAAS at the centre, connecting schools, students, professionals, industry and institutions">
      <defs>
        <radialGradient id="ws-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#02ae3e" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#02ae3e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={250} fill="url(#ws-glow)" />
      <g className="spin-slow">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#e2e4e9" strokeWidth="1.5" strokeDasharray="2 10" />
      </g>
      <circle cx={cx} cy={cy} r={R - 70} fill="none" stroke="#eef0f3" strokeWidth="1" />
      {pts.map((p, i) => (
        <g key={p.label}>
          <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e4e9" strokeWidth="2" />
          <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#02ae3e" strokeWidth="2" className="flow" style={{ animationDelay: `${i * 0.25}s` }} />
          <line x1={p.x} y1={p.y} x2={pts[(i + 1) % pts.length].x} y2={pts[(i + 1) % pts.length].y} stroke="#eef0f3" strokeWidth="1.5" />
        </g>
      ))}
      <circle cx={cx} cy={cy} r={74} fill="#fff" stroke="#e2e4e9" strokeWidth="1.5" />
      <svg x={cx - 44} y={cy - 46} width="88" height="78" viewBox="80 38 382 340">
        <LogoShapes animate />
      </svg>
      <text x={cx} y={cy + 52} textAnchor="middle" fontSize="15" fontWeight="700" fill="#000e21" letterSpacing="2">GRAAS</text>
      {pts.map((p, i) => (
        <g key={p.label + "n"} className="node-pop" style={{ animationDelay: `${i * 0.6}s`, transformBox: "fill-box" }}>
          <circle cx={p.x} cy={p.y} r={40} fill={i === 3 ? "#000e21" : "#fff"} stroke={i === 3 ? "#000e21" : "#e2e4e9"} strokeWidth="1.5" />
          <svg x={p.x - 14} y={p.y - 14} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={i === 3 ? "#fff" : "#000e21"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={iconPath(p.icon)} />
          </svg>
          <circle cx={p.x + 28} cy={p.y - 28} r="6" fill="#02ae3e" stroke="#fff" strokeWidth="2" />
          <text x={p.x} y={p.y + 60} textAnchor="middle" fontSize="16" fontWeight="600" fill="#000e21">{p.label}</text>
          <text x={p.x} y={p.y + 79} textAnchor="middle" fontSize="12.5" fill="#4a515c">{p.sub}</text>
        </g>
      ))}
    </svg>
  );
}

export default function WhatIsGraas() {
  return (
    <section id="what-is-graas" className="section relative overflow-hidden">
      <div className="shell grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-go-deep">
            <span className="dot" aria-hidden="true" />
            What is GRAAS
          </p>
          <h2 className="h-section mt-3">A society that connects the classroom to the factory floor.</h2>
          <div className="mt-5 grid gap-4 text-[1.05rem] text-ink2 sm:text-[1.1rem]">
            <p>
              The <strong className="text-ink">Global Robotics And Automation Society</strong> is a membership society for robotics and automation in India. It is
              where a Class 8 student builds a first robot, an engineering student finds a team and a competition, a faculty member brings industry
              into the lab, and a company meets the people it will hire.
            </p>
            <p>
              Robotics and automation are changing how things are made. Too many students meet them only in a textbook, and too many factories
              cannot find people who have built anything. GRAAS exists to close that gap, through learning, chapters, competitions and industry
              work, with every member verified and every certificate checkable by a QR code.
            </p>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/about" className="btn btn-ghost">
              More about GRAAS
            </Link>
            <Link href="/membership" className="btn btn-primary">
              Membership benefits
            </Link>
          </div>
        </div>
        <Reveal className="mx-auto w-full max-w-[560px]">
          <Network />
        </Reveal>
      </div>
      <div className="shell mt-12 lg:mt-16">
        <ol className="grid gap-px overflow-hidden rounded-[24px] border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
          {PILLARS.map((p, i) => (
            <li key={p.title} className="group relative bg-white p-6 transition-colors hover:bg-mist sm:p-7">
              <Reveal delay={i * 0.08}>
                <span className="readout text-sm text-slate5">{p.n}</span>
                <span aria-hidden="true" className="mt-3 flex h-8 items-end gap-1">
                  {[0, 1, 2, 3].map((b) => (
                    <span key={b} className="w-2 rounded-t-[2px] transition-all duration-500 group-hover:opacity-100" style={{ height: 10 + b * 6, background: b <= i ? ["#b7babf", "#8e919a", "#5a616b", "#000e21"][b] : "#e2e4e9" }} />
                  ))}
                  {i === 3 && <span className="dot mb-6 ml-0.5" />}
                </span>
                <h3 className="h-card mt-4">{p.title}</h3>
                <p className="mt-2 text-ink2">{p.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
