"use client";

import { useInView } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import ArmStage from "@/components/fx/ArmStage";

const rad = (d: number) => (d * Math.PI) / 180;
const WORDS = ["Learn", "Build", "Compete", "Lead"];
const TONES = ["#b7babf", "#8e919a", "#5a616b", "#000e21"];

function Shell({ stage, children }: { stage: ReactNode; children: ReactNode }) {
  return (
    <div className="grid lg:grid-cols-[1.5fr_1fr]">
      <div className="grid-faint relative min-h-[320px] border-b border-line bg-mist sm:min-h-[400px] lg:min-h-[460px] lg:border-b-0 lg:border-r 2xl:min-h-[580px]">{stage}</div>
      <div className="flex flex-col p-6 sm:p-8">{children}</div>
    </div>
  );
}

/* Pick and place: the arm runs on its own; the visitor can take over. Each block placed lights one bar. */
function PickPlace() {
  const [placed, setPlaced] = useState([false, false, false, false]);
  const [count, setCount] = useState(0);
  const onPlace = useCallback((i: number) => {
    setPlaced((p) => p.map((v, k) => v || k === i));
    setCount((c) => c + 1);
  }, []);
  const all = placed.every(Boolean);

  return (
    <Shell
      stage={
        <div className="absolute inset-0">
          <ArmStage words={WORDS} onPlace={onPlace} />
        </div>
      }
    >
      <h3 className="h-card">Pick and place</h3>
      <p className="mt-2 text-ink2">
        The first job most industrial robots learn. This arm works out its own joint angles for every move, the same
        mathematics members study in the robotics basics course.
      </p>
      <p className="mt-4 text-[0.95rem] text-ink2">
        <span className="pointer-coarse:hidden">Move over the cell to steer. Click a block to grip it, then click above the belt to set it down.</span>
        <span className="hidden pointer-coarse:inline">Tap the cell to steer. Tap a block to grip it, then tap above the belt to set it down.</span>
      </p>
      <div className="mt-auto pt-8">
        <div className="flex items-end gap-5">
          <svg width="96" height="86" viewBox="80 38 382 340" role="img" aria-label={`${placed.filter(Boolean).length} of 4 blocks placed`}>
            {["M114 364V279L139.5 246L165 279V364Z", "M200 364V220L225 186L250 220V364Z", "M284 364V167L309.5 132L335 167V364Z", "M372 364V123L397.5 89L423 123V364Z"].map((d, i) => (
              <path key={i} d={d} fill={placed[i] ? TONES[i] : "#e2e4e9"} style={{ transition: "fill 500ms" }} />
            ))}
            <circle cx="397" cy="64" r="18.5" fill={all ? "#02ae3e" : "#e2e4e9"} style={{ transition: "fill 500ms 200ms" }} />
            <rect x="87" y="364" width="368" height="7" rx="3.5" fill="#010d21" />
          </svg>
          <p className="pb-1 text-[0.95rem]" aria-live="polite">
            <span className="readout block text-sm text-ink2">Blocks placed {String(count).padStart(2, "0")}</span>
            <span className="font-semibold">{all ? "Learn, build, compete, lead. That is the member's climb." : "Each block placed lights a bar."}</span>
          </p>
        </div>
      </div>
    </Shell>
  );
}

/* Joint control: forward kinematics by hand. Move three joints until the tool tip touches the target. */
function JogDemo() {
  const [j, setJ] = useState([72, -84, -28]);
  const [hits, setHits] = useState(0);
  const base = { x: 78, y: 174 };
  const L = [92, 76, 34];
  const targets = [
    { x: 228, y: 84 },
    { x: 162, y: 48 },
    { x: 252, y: 142 },
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
    <Shell
      stage={
        <svg viewBox="0 0 320 224" className="absolute inset-0 h-full w-full" role="img" aria-label="A three-joint arm you control with the sliders">
          <line x1="0" y1="202" x2="320" y2="202" stroke="#b7babf" strokeWidth="1.5" />
          <circle cx={t.x} cy={t.y} r="10" fill="none" stroke="#067a2e" strokeWidth="1.5" strokeDasharray="4 4" />
          <circle cx={t.x} cy={t.y} r="3.5" fill="#02ae3e" />
          {reached && <circle cx={t.x} cy={t.y} r="10" fill="none" stroke="#02ae3e" strokeWidth="2" style={{ transformOrigin: `${t.x}px ${t.y}px`, animation: "pulse-ring 800ms ease-out" }} />}
          <path d={`M${base.x - 24} 202 L${base.x + 24} 202 L${base.x + 13} ${base.y} L${base.x - 13} ${base.y} Z`} fill="#000e21" />
          <g strokeLinecap="round" fill="none">
            <line x1={base.x} y1={base.y} x2={p1.x} y2={p1.y} stroke="#b7babf" strokeWidth="16" />
            <line x1={base.x} y1={base.y} x2={p1.x} y2={p1.y} stroke="#fff" strokeWidth="13.5" />
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#b7babf" strokeWidth="12" />
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#fff" strokeWidth="9.5" />
            <line x1={p2.x} y1={p2.y} x2={p3.x} y2={p3.y} stroke="#000e21" strokeWidth="6" />
          </g>
          {[base, p1, p2].map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={7.5 - i} fill="#000e21" />
              <circle cx={p.x} cy={p.y} r={2.6 - i * 0.3} fill="#02ae3e" />
            </g>
          ))}
          <circle cx={p3.x} cy={p3.y} r="3.5" fill="#000e21" />
        </svg>
      }
    >
      <h3 className="h-card">Joint control</h3>
      <p className="mt-2 text-ink2">Turn three joints until the tool tip touches the green target. Working out where the tip ends up from the angles is called forward kinematics.</p>
      <div className="mt-6 grid gap-1.5">
        {joints.map((q, i) => (
          <label key={q.name} className="grid grid-cols-[5rem_1fr_3.4rem] items-center gap-3 text-[0.95rem] font-medium">
            <span>{q.name}</span>
            <input className="jog" type="range" min={q.min} max={q.max} value={j[i]} onChange={(e) => setJ((v) => v.map((x, k) => (k === i ? Number(e.target.value) : x)))} />
            <span className="readout text-right text-sm text-ink2">{j[i]}°</span>
          </label>
        ))}
      </div>
      <p className="mt-auto pt-8 text-[0.95rem] font-semibold" aria-live="polite">
        {hits === 0 ? "No target reached yet." : `Targets reached: ${hits}. A new one has appeared.`}
      </p>
    </Shell>
  );
}

/* Line follower: tune one number, the steering gain, for a faster lap. */
function RaceDemo() {
  const wrap = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const botRef = useRef<SVGGElement>(null);
  const inView = useInView(wrap, { margin: "0px" });
  const [kp, setKp] = useState(18);
  const kpRef = useRef(kp);
  useEffect(() => {
    kpRef.current = kp;
  }, [kp]);
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
      <Shell
        stage={
          <svg viewBox="0 0 314 208" className="absolute inset-0 h-full w-full" role="img" aria-label="A small robot following a line around a track">
            <path ref={pathRef} d="M59 104 C59 34 129 28 175 60 S269 36 269 104 S221 184 171 150 S59 180 59 104 Z" fill="none" stroke="#000e21" strokeWidth="4.5" strokeLinecap="round" />
            <rect x="52" y="101" width="14" height="3" rx="1.5" fill="#02ae3e" />
            <g ref={botRef} transform="translate(59 104)">
              <rect x="-11" y="-8" width="22" height="16" rx="5" fill="#fff" stroke="#000e21" strokeWidth="1.75" />
              <rect x="-7" y="-11" width="8" height="3.5" rx="1.2" fill="#000e21" />
              <rect x="-7" y="7.5" width="8" height="3.5" rx="1.2" fill="#000e21" />
              <circle cx="6.5" cy="0" r="2.4" fill="#02ae3e" />
            </g>
          </svg>
        }
      >
        <h3 className="h-card">Line follower</h3>
        <p className="mt-2 text-ink2">The classic first competition robot. One number, the steering gain, decides the lap. Too low and it wanders off the line. Too high and it shakes.</p>
        <label className="mt-6 grid grid-cols-[auto_1fr_2.4rem] items-center gap-3 text-[0.95rem] font-medium">
          <span>Steering gain</span>
          <input className="jog" type="range" min={0} max={100} value={kp} onChange={(e) => setKp(Number(e.target.value))} />
          <span className="readout text-right text-sm text-ink2">{kp}</span>
        </label>
        <dl className="mt-auto grid grid-cols-2 gap-4 pt-8">
          <div className="rounded-2xl bg-mist p-4">
            <dt className="text-sm text-ink2">Last lap</dt>
            <dd className="readout mt-1 text-2xl font-medium">{lap ? `${lap.toFixed(2)} s` : "--.-- s"}</dd>
          </div>
          <div className="rounded-2xl bg-mist p-4">
            <dt className="text-sm text-ink2">Best lap</dt>
            <dd className="readout mt-1 text-2xl font-medium">{best ? `${best.toFixed(2)} s` : "--.-- s"}</dd>
          </div>
        </dl>
      </Shell>
    </div>
  );
}

const TABS = [
  { id: "pick", label: "Pick and place", el: <PickPlace /> },
  { id: "jog", label: "Joint control", el: <JogDemo /> },
  { id: "race", label: "Line follower", el: <RaceDemo /> },
];

export default function Lab() {
  const [tab, setTab] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: React.KeyboardEvent) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (tab + d + TABS.length) % TABS.length;
    setTab(n);
    refs.current[n]?.focus();
  }

  return (
    <section id="lab" className="section bg-mist">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="h-section">Try the work before you join.</h2>
            <p className="lede mt-4">Three small machines that run right here on this page. Each is a first lesson from what members learn.</p>
          </div>
        </div>
        <div className="card mt-7 overflow-hidden shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-3 sm:px-5">
            <div role="tablist" aria-label="Demonstrations" className="flex gap-1 overflow-x-auto rounded-full bg-mist p-1" onKeyDown={onKey}>
              {TABS.map((t, i) => (
                <button
                  key={t.id}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  role="tab"
                  type="button"
                  id={`lab-tab-${t.id}`}
                  aria-selected={tab === i}
                  aria-controls="lab-panel"
                  tabIndex={tab === i ? 0 : -1}
                  onClick={() => setTab(i)}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold sm:px-4 sm:text-[0.95rem] transition-colors ${tab === i ? "bg-ink text-white" : "text-ink2 hover:text-ink"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="hidden items-center gap-2 pr-1 text-sm font-medium text-ink2 sm:flex">
              <span className="dot dot-live" /> Running live
            </p>
          </div>
          <div id="lab-panel" role="tabpanel" aria-labelledby={`lab-tab-${TABS[tab].id}`}>
            {TABS[tab].el}
          </div>
        </div>
      </div>
    </section>
  );
}
