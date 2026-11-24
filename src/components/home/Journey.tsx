"use client";

import Link from "next/link";
import { AnimatePresence, motion, useInView, useScroll, useSpring } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

const rad = (d: number) => (d * Math.PI) / 180;

/* 1 · Learn: forward kinematics you can try. Move three joints, touch the target. */
function JogDemo() {
  const [j, setJ] = useState([72, -84, -28]);
  const [hits, setHits] = useState(0);
  const base = { x: 64, y: 190 };
  const L = [92, 76, 34];
  const targets = [
    { x: 214, y: 92 },
    { x: 150, y: 58 },
    { x: 236, y: 150 },
  ];
  const a1 = rad(j[0]), a2 = a1 + rad(j[1]), a3 = a2 + rad(j[2]);
  const p1 = { x: base.x + L[0] * Math.cos(a1), y: base.y - L[0] * Math.sin(a1) };
  const p2 = { x: p1.x + L[1] * Math.cos(a2), y: p1.y - L[1] * Math.sin(a2) };
  const p3 = { x: p2.x + L[2] * Math.cos(a3), y: p2.y - L[2] * Math.sin(a3) };
  const t = targets[hits % targets.length];
  const reached = Math.hypot(p3.x - t.x, p3.y - t.y) < 9;

  useEffect(() => {
    if (!reached) return;
    const id = setTimeout(() => setHits((h) => h + 1), 850);
    return () => clearTimeout(id);
  }, [reached]);

  const joints = [
    { name: "Shoulder", min: 0, max: 170 },
    { name: "Elbow", min: -160, max: 20 },
    { name: "Wrist", min: -120, max: 120 },
  ];

  return (
    <div>
      <svg viewBox="0 0 300 214" className="blueprint w-full rounded-lg border border-line" role="img" aria-label="A three-joint arm you control with the sliders below">
        <line x1="0" y1="196" x2="300" y2="196" stroke="#0c1330" strokeWidth="2" />
        <circle cx={t.x} cy={t.y} r="9" fill="none" stroke="#1f3fff" strokeWidth="2" strokeDasharray="4 4" />
        <circle cx={t.x} cy={t.y} r="3" fill={reached ? "#0b8f62" : "#1f3fff"} />
        {reached && <circle cx={t.x} cy={t.y} r="9" fill="none" stroke="#0b8f62" strokeWidth="2" style={{ transformOrigin: `${t.x}px ${t.y}px`, animation: "pulse-ring 800ms ease-out" }} />}
        <path d={`M${base.x - 22} 196 L${base.x + 22} 196 L${base.x + 12} ${base.y - 2} L${base.x - 12} ${base.y - 2} Z`} fill="#0c1330" />
        <g strokeLinecap="round" fill="none">
          <line x1={base.x} y1={base.y} x2={p1.x} y2={p1.y} stroke="#0c1330" strokeWidth="17" />
          <line x1={base.x} y1={base.y} x2={p1.x} y2={p1.y} stroke="#fff" strokeWidth="13" />
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#0c1330" strokeWidth="13" />
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#fff" strokeWidth="9" />
          <line x1={p2.x} y1={p2.y} x2={p3.x} y2={p3.y} stroke="#0c1330" strokeWidth="8" />
          <line x1={p2.x} y1={p2.y} x2={p3.x} y2={p3.y} stroke="#1f3fff" strokeWidth="4" />
        </g>
        {[base, p1, p2].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={7 - i} fill="#ff5b1a" stroke="#0c1330" strokeWidth="2" />
        ))}
        <circle cx={p3.x} cy={p3.y} r="3.5" fill="#0c1330" />
      </svg>
      <div className="mt-4 grid gap-1">
        {joints.map((q, i) => (
          <label key={q.name} className="grid grid-cols-[5.2rem_1fr_3.6rem] items-center gap-3 text-sm font-semibold">
            <span>{q.name}</span>
            <input
              className="jog"
              type="range"
              min={q.min}
              max={q.max}
              value={j[i]}
              onChange={(e) => setJ((v) => v.map((x, k) => (k === i ? Number(e.target.value) : x)))}
            />
            <span className="readout text-right text-ink2">{j[i]}°</span>
          </label>
        ))}
      </div>
      <p className="mt-3 text-sm text-ink2" aria-live="polite">
        {hits === 0
          ? "Move the joints until the tool tip touches the blue target."
          : `Targets reached: ${hits}. You just did forward kinematics by hand.`}
      </p>
    </div>
  );
}

/* 2 · Build: classmates link up into a chapter. */
function ChapterDemo() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const c = { x: 150, y: 104 };
  const nodes = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    return { x: c.x + Math.cos(a) * 112 * (i % 2 ? 0.86 : 1), y: c.y + Math.sin(a) * 78 * (i % 2 ? 1 : 0.9) };
  });
  return (
    <div>
      <svg ref={ref} viewBox="0 0 300 208" className="blueprint w-full rounded-lg border border-line" role="img" aria-label="Eight classmates connecting to form one chapter">
        {nodes.map((n, i) => (
          <motion.line
            key={i}
            x1={n.x}
            y1={n.y}
            x2={c.x}
            y2={c.y}
            stroke="#1f3fff"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.15 + i * 0.12, ease: "easeOut" }}
          />
        ))}
        {nodes.map((n, i) => (
          <motion.circle
            key={i}
            cx={n.x}
            cy={n.y}
            r="9"
            fill="#fff"
            stroke="#0c1330"
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={inView ? { scale: 1 } : {}}
            transition={{ type: "spring", stiffness: 300, damping: 18, delay: i * 0.12 }}
            style={{ transformOrigin: `${n.x}px ${n.y}px` }}
          />
        ))}
        <motion.g
          initial={{ scale: 0.4, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : {}}
          transition={{ type: "spring", stiffness: 220, damping: 14, delay: 1.25 }}
          style={{ transformOrigin: `${c.x}px ${c.y}px` }}
        >
          <path d={`M${c.x} ${c.y - 42} l36 21 v42 l-36 21 l-36 -21 v-42 z`} fill="#ff5b1a" stroke="#0c1330" strokeWidth="2.5" />
          <text x={c.x} y={c.y + 1} textAnchor="middle" fontSize="11" fontWeight="800" fill="#0c1330">
            YOUR
          </text>
          <text x={c.x} y={c.y + 14} textAnchor="middle" fontSize="11" fontWeight="800" fill="#0c1330">
            CHAPTER
          </text>
        </motion.g>
      </svg>
      <ol className="mt-4 grid gap-2 text-sm font-semibold sm:grid-cols-3">
        {["Classmates join", "Faculty coordinator named", "Chapter workspace opens"].map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className="readout flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs text-white">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* 3 · Compete: a line follower. Tune the steering gain for a faster lap. */
function RaceDemo() {
  const wrap = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const botRef = useRef<SVGGElement>(null);
  const inView = useInView(wrap, { margin: "0px" });
  const [kp, setKp] = useState(18);
  const kpRef = useRef(kp);
  kpRef.current = kp;
  const [lap, setLap] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => {
    const path = pathRef.current, bot = botRef.current;
    if (!path || !bot || !inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const total = path.getTotalLength();
    let dist = 0, phase = 0, last = performance.now(), lapStart = last, raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = kpRef.current;
      const off = Math.abs(k - 55) / 55;
      const speed = 70 + 120 * (1 - off);
      const amp = k < 55 ? ((55 - k) / 55) * 13 : ((k - 55) / 45) * 5;
      phase += dt * (k < 55 ? 3.2 : 16);
      dist += speed * dt;
      if (dist >= total) {
        dist -= total;
        const t = (now - lapStart) / 1000;
        lapStart = now;
        setLap(t);
        setBest((b) => (b === null || t < b ? t : b));
      }
      const p = path.getPointAtLength(dist);
      const q = path.getPointAtLength((dist + 2) % total);
      const ang = Math.atan2(q.y - p.y, q.x - p.x);
      const w = Math.sin(phase) * amp;
      const x = p.x - Math.sin(ang) * w, y = p.y + Math.cos(ang) * w;
      bot.setAttribute("transform", `translate(${x} ${y}) rotate(${(ang * 180) / Math.PI + Math.cos(phase) * amp * 1.6})`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView]);

  return (
    <div ref={wrap}>
      <svg viewBox="0 0 300 208" className="w-full rounded-lg border border-line bg-surface" role="img" aria-label="A small robot following a black line around a track">
        <path
          ref={pathRef}
          d="M52 104 C52 34 122 28 168 60 S262 36 262 104 S214 184 164 150 S52 180 52 104 Z"
          fill="none"
          stroke="#0c1330"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <rect x="46" y="98" width="12" height="12" fill="#ffc400" stroke="#0c1330" strokeWidth="1.5" />
        <g ref={botRef} transform="translate(52 104)">
          <rect x="-11" y="-8" width="22" height="16" rx="4" fill="#ff5b1a" stroke="#0c1330" strokeWidth="2" />
          <rect x="-7" y="-11" width="8" height="3.5" rx="1" fill="#0c1330" />
          <rect x="-7" y="7.5" width="8" height="3.5" rx="1" fill="#0c1330" />
          <circle cx="8" cy="0" r="2.2" fill="#1f3fff" />
        </g>
      </svg>
      <label className="mt-4 grid grid-cols-[auto_1fr_2.6rem] items-center gap-3 text-sm font-semibold">
        <span>Steering gain</span>
        <input className="jog" type="range" min={0} max={100} value={kp} onChange={(e) => setKp(Number(e.target.value))} />
        <span className="readout text-right text-ink2">{kp}</span>
      </label>
      <p className="readout mt-2 text-sm text-ink2" aria-live="off">
        Last lap {lap ? lap.toFixed(2) : "--.--"} s <span className="mx-2 text-line">|</span> Best {best ? best.toFixed(2) : "--.--"} s
      </p>
      <p className="mt-1 text-sm text-ink2">Too low and it wanders. Too high and it shakes. Find the gain that wins.</p>
    </div>
  );
}

/* 4 · Get hired: the kind of problem a company posts. */
const SAMPLES = [
  { field: "Machine vision", title: "Check machined parts with a camera instead of by eye", ask: "A low-cost inspection station that flags surface defects on a moving line." },
  { field: "Mobile robots", title: "Move bins between two lines without a forklift", ask: "A small cart that follows a marked path and stops safely around people." },
  { field: "IoT and PLC", title: "Get cycle data out of a twenty-year-old press", ask: "Sensors and a logger that record every stroke without touching the machine's controls." },
];
function HireDemo() {
  const [i, setI] = useState(0);
  const s = SAMPLES[i];
  return (
    <div>
      <div className="relative min-h-[13.5rem]">
        <div className="absolute inset-x-3 top-3 h-full rounded-xl border-[1.5px] border-ink bg-cobalt-soft" aria-hidden="true" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            key={i}
            initial={{ x: 60, rotate: 4, opacity: 0 }}
            animate={{ x: 0, rotate: 0, opacity: 1 }}
            exit={{ x: -70, rotate: -5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative rounded-xl border-[1.5px] border-ink bg-surface p-5"
          >
            <p className="text-sm font-semibold text-cobalt">{s.field}</p>
            <h4 className="mt-2 text-xl font-bold leading-snug">{s.title}</h4>
            <p className="mt-2 text-ink2">{s.ask}</p>
            <p className="mt-4 text-xs text-ink2">A sample of the kind of problem companies will post.</p>
          </motion.article>
        </AnimatePresence>
      </div>
      <button type="button" className="btn btn-quiet mt-7 !min-h-10 !py-2" onClick={() => setI((v) => (v + 1) % SAMPLES.length)}>
        Show another problem
      </button>
    </div>
  );
}

type Station = { n: number; title: string; body: string; href: string; link: string; demo: ReactNode };
const STATIONS: Station[] = [
  {
    n: 1,
    title: "Learn it live, replay it later",
    body: "Open lectures run live and stay up as replays. Courses go from robotics basics to PLC, ROS and machine vision, each with quizzes and a certificate you earn by finishing.",
    href: "/learn",
    link: "What you can learn",
    demo: <JogDemo />,
  },
  {
    n: 2,
    title: "Start a chapter in your college",
    body: "Bring your classmates, name a faculty coordinator, and get a chapter workspace: your own roster, events and a record of everything you run.",
    href: "/chapters",
    link: "How chapters work",
    demo: <ChapterDemo />,
  },
  {
    n: 3,
    title: "Put your robot against the clock",
    body: "Team challenges for school, college and open divisions, with published rules, real judges and a public leaderboard.",
    href: "/events",
    link: "Events and competitions",
    demo: <RaceDemo />,
  },
  {
    n: 4,
    title: "Solve a real factory problem",
    body: "Companies post automation problems. Student teams propose, prototype and demo. Jobs and internships sit on the same board.",
    href: "/industry",
    link: "For students and for companies",
    demo: <HireDemo />,
  },
];

function StationRow({ s }: { s: Station }) {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, { margin: "-45% 0px -45% 0px" });
  const seen = useInView(ref, { once: true, margin: "-30% 0px" });
  return (
    <div ref={ref} className="relative grid gap-8 pl-10 sm:pl-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-14">
      <span
        aria-hidden="true"
        className={`readout absolute left-0 top-1 flex h-8 w-8 -translate-x-[calc(50%-1.5px)] items-center justify-center rounded-full border-2 border-ink text-sm font-bold transition-colors duration-300 sm:h-10 sm:w-10 ${
          seen ? (on ? "bg-signal text-ink" : "bg-cobalt text-white") : "bg-surface text-ink"
        }`}
      >
        {s.n}
      </span>
      <div className="lg:pt-1">
        <h3 className="display text-5xl sm:text-6xl">{s.title}</h3>
        <p className="lede mt-5">{s.body}</p>
        <Link href={s.href} className="mt-5 inline-block font-bold text-cobalt underline decoration-2 underline-offset-[6px] hover:decoration-signal">
          {s.link}
        </Link>
      </div>
      <div className="plate p-4 sm:p-5">{s.demo}</div>
    </div>
  );
}

export default function Journey() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.7", "end 0.6"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 140, damping: 32 });
  return (
    <section id="journey" className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 lg:py-28">
      <h2 className="display max-w-4xl text-6xl sm:text-7xl lg:text-8xl">Four stations. One line from classroom to shop floor.</h2>
      <p className="lede mt-5">Each one has something to try right now.</p>
      <div ref={ref} className="relative ml-4 mt-16 grid gap-20 sm:ml-5 lg:gap-28">
        <div aria-hidden="true" className="absolute bottom-0 left-0 top-0 w-[3px] rounded bg-line" />
        <motion.div aria-hidden="true" style={{ scaleY }} className="absolute bottom-0 left-0 top-0 w-[3px] origin-top rounded bg-cobalt" />
        {STATIONS.map((s) => (
          <StationRow key={s.n} s={s} />
        ))}
      </div>
    </section>
  );
}
