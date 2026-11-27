"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";

/**
 * "Find your branch" on the Chapters page: how each engineering branch connects to robotics and automation.
 * These are suggestions only. Any branch can form a chapter (the chapter form has "Other" with free typing),
 * so the box at the bottom accepts any branch name and always answers with a welcome.
 */

/** The layers of a robot or an automated line, from the ground up. */
const LAYERS = [
  { name: "Mechanism", parts: "Frames, arms, joints, gears, grippers" },
  { name: "Actuation and power", parts: "Motors, drives, pneumatics, hydraulics, panels" },
  { name: "Sensing and electronics", parts: "Sensors, circuit boards, embedded controllers" },
  { name: "Control", parts: "PLCs, control loops, motion control, SCADA" },
  { name: "Software and intelligence", parts: "Code, ROS, vision, AI, data, IoT" },
];

type Branch = {
  key: string;
  name: string;
  tag: string;
  aliases: string[];
  line: string;
  layers: number[];
  builds: string[];
  skills: string[];
  roles: string[];
};

const FEATURED: Branch[] = [
  {
    key: "ra",
    name: "Robotics and Automation",
    tag: "The whole field, end to end",
    aliases: ["robotics and automation", "automation and robotics", "robotics", "automation", "r&a", "a&r", "rae"],
    line: "Your degree is this field. A chapter gives you the machines, the team and the competitions to prove what you can do with it.",
    layers: [0, 1, 2, 3, 4],
    builds: ["A pick-and-place arm run by a PLC and a camera", "An autonomous line-following or warehouse robot", "A small sorting cell for a local factory"],
    skills: ["Robot programming", "PLC and SCADA", "ROS", "Machine vision", "Control systems"],
    roles: ["Robotics engineer", "Automation engineer", "Robot programmer and integrator"],
  },
  {
    key: "mechatronics",
    name: "Mechatronics",
    tag: "Mechanical, electrical and code together",
    aliases: ["mechatronics", "mechatronic"],
    line: "Mechatronics sits exactly where a robot lives: the joint between the machine, its electronics and the program that drives it.",
    layers: [0, 1, 2, 3, 4],
    builds: ["A self-balancing robot", "A smart conveyor with sensors and a PLC", "A 3D-printed gripper with servo control"],
    skills: ["Sensors and actuators", "Embedded C", "PLC programming", "CAD", "Pneumatics"],
    roles: ["Mechatronics engineer", "Controls engineer", "Commissioning engineer"],
  },
  {
    key: "mechanical",
    name: "Mechanical",
    tag: "Arms, joints, gears, grippers",
    aliases: ["mechanical", "mech", "me"],
    line: "Every robot is a machine first. Its arms, joints, gears, grippers and the forces on them are mechanical engineering.",
    layers: [0, 1],
    builds: ["Design and 3D-print a four-axis robot arm", "A pneumatic pick-and-place station", "A rover chassis for an inter-college challenge"],
    skills: ["CAD (SolidWorks, Fusion 360)", "Kinematics", "Pneumatics and hydraulics", "3D printing", "CNC programming"],
    roles: ["Robot design engineer", "Automation design engineer", "Plant and maintenance engineer"],
  },
  {
    key: "electrical",
    name: "Electrical",
    tag: "Motors, drives, panels, power",
    aliases: ["electrical", "eee", "ee", "electrical and electronics"],
    line: "Robots and production lines run on motors, drives and panels, and on the PLCs that switch them safely.",
    layers: [1, 3],
    builds: ["A motor-control panel with a VFD and a PLC", "Energy monitoring for a workshop with smart meters", "A soft-start and speed-control demo rig"],
    skills: ["Motor drives and VFDs", "Electrical panel design", "PLC programming", "Industrial safety", "Power electronics"],
    roles: ["Electrical automation engineer", "PLC and SCADA engineer", "Commissioning engineer"],
  },
  {
    key: "electronics",
    name: "Electronics and E&TC",
    tag: "Sensors, boards, embedded, IoT",
    aliases: ["electronics", "electronics and telecommunication", "e&tc", "entc", "extc", "etc", "ece", "ec", "telecommunication", "electronics and communication"],
    line: "Sensors, circuit boards, embedded controllers and the wireless links between machines are electronics.",
    layers: [2, 3, 4],
    builds: ["A sensor board for a robot on Arduino or ESP32", "A wireless robot with live telemetry", "An IoT dashboard for a machine's temperature and vibration"],
    skills: ["Embedded C", "PCB design", "Sensors and actuators", "IoT", "Communication protocols"],
    roles: ["Embedded systems engineer", "IoT engineer", "Test and validation engineer"],
  },
  {
    key: "computer",
    name: "Computer and IT",
    tag: "The robot's brain: software",
    aliases: ["computer", "computer science", "computer engineering", "information technology", "cse", "cs", "ce", "it", "software"],
    line: "The brain of a modern robot is software: path planning, vision, ROS, apps, cloud and the data that comes back from machines.",
    layers: [4],
    builds: ["A robot simulation in ROS and Gazebo", "A camera that counts or inspects parts with OpenCV", "A web dashboard that watches a machine live"],
    skills: ["Python", "C++", "ROS", "OpenCV", "Cloud and IoT platforms"],
    roles: ["Robotics software engineer", "Computer vision engineer", "Industrial IoT developer"],
  },
  {
    key: "instrumentation",
    name: "Instrumentation",
    tag: "Measure and control processes",
    aliases: ["instrumentation", "instrumentation and control", "ic", "eie", "instru"],
    line: "Measuring and controlling a process, its flow, pressure, temperature and level, is the heart of automation in every plant.",
    layers: [2, 3],
    builds: ["A PID-controlled water-tank level rig", "A data logger for the lab's sensors", "A small SCADA screen for a model process"],
    skills: ["Process control", "Sensors and transmitters", "PID tuning", "SCADA", "Calibration"],
    roles: ["Instrumentation engineer", "Control systems engineer", "DCS and SCADA engineer"],
  },
  {
    key: "ai",
    name: "AI and Data Science",
    tag: "Robots that see, learn, decide",
    aliases: ["artificial intelligence", "data science", "ai and data science", "ai&ds", "aids", "ai ds", "aiml", "ai&ml", "machine learning", "ai"],
    line: "Robots that see, learn and decide need models and data: vision, prediction and smarter control.",
    layers: [4],
    builds: ["A defect-detection model for product photos", "Predictive maintenance from vibration data", "A voice- or gesture-controlled robot"],
    skills: ["Machine learning", "Python", "Computer vision", "Data analysis", "Edge AI"],
    roles: ["AI engineer for automation", "Data scientist in manufacturing", "Machine learning engineer"],
  },
];

const MORE: Branch[] = [
  {
    key: "production",
    name: "Production and Industrial",
    tag: "Lines, cells, productivity",
    aliases: ["production", "industrial", "manufacturing", "industrial and production", "ip", "pe"],
    line: "Production lines, cells, layout and productivity are where automation earns its keep.",
    layers: [0, 3],
    builds: ["An automation plan for a local workshop", "A lean, automated assembly station", "A digital twin of a small line"],
    skills: ["Lean manufacturing", "CNC programming", "Industrial engineering", "Digital twin", "Quality control"],
    roles: ["Manufacturing engineer", "Automation project engineer", "Industrial engineer"],
  },
  {
    key: "automobile",
    name: "Automobile",
    tag: "EVs, ADAS, robotic body shops",
    aliases: ["automobile", "automotive", "auto"],
    line: "Car plants are among the most automated factories, and vehicles themselves now sense, steer and brake on their own.",
    layers: [0, 1, 2],
    builds: ["A small autonomous car that stops for obstacles", "An EV battery monitor", "A model robotic welding cell"],
    skills: ["EV systems", "Sensors", "Embedded C", "CAD", "Vehicle dynamics"],
    roles: ["Automotive automation engineer", "ADAS and EV engineer", "Body-shop robotics engineer"],
  },
  {
    key: "civil",
    name: "Civil",
    tag: "Drones, smart structures",
    aliases: ["civil", "construction", "structural"],
    line: "Drones survey sites, robots print and inspect structures, and sensors watch bridges and buildings.",
    layers: [0, 2],
    builds: ["A drone survey of the campus", "Sensors that monitor a beam or a slab", "A small 3D-printing or bricklaying demo"],
    skills: ["Drones", "GIS and surveying", "Structural sensors", "BIM", "3D printing"],
    roles: ["Construction technology engineer", "Drone survey specialist", "Smart infrastructure engineer"],
  },
  {
    key: "chemical",
    name: "Chemical",
    tag: "Process automation, DCS",
    aliases: ["chemical", "petroleum", "petrochemical"],
    line: "Chemical plants are run by automation: sensors, control loops and DCS keep every process safe and steady.",
    layers: [2, 3],
    builds: ["A pH or temperature control loop for a lab reactor", "A safety interlock demo", "A small batch process run by a PLC"],
    skills: ["Process control", "DCS", "Instrumentation", "Safety systems", "Data analysis"],
    roles: ["Process automation engineer", "DCS engineer", "Plant safety engineer"],
  },
  {
    key: "aero",
    name: "Aerospace",
    tag: "Drones and flying robots",
    aliases: ["aerospace", "aeronautical", "aeronautics", "aero", "avionics"],
    line: "Drones, satellites and aircraft are flying robots: frames, sensors, flight control and autonomy.",
    layers: [0, 2, 3],
    builds: ["A quadcopter with your own flight-control tuning", "A CubeSat-style sensor payload", "An autonomous drone mission"],
    skills: ["Drones", "Flight control", "CAD", "Embedded C", "Aerodynamics"],
    roles: ["Drone and UAV engineer", "Avionics engineer", "Flight software engineer"],
  },
  {
    key: "bio",
    name: "Biomedical",
    tag: "Medical robots, prosthetics",
    aliases: ["biomedical", "bio medical", "medical electronics", "bme"],
    line: "Surgical robots, prosthetic hands, rehabilitation devices and lab automation all start in biomedical engineering.",
    layers: [0, 2, 4],
    builds: ["A prosthetic hand driven by muscle (EMG) sensors", "A smart medicine dispenser", "A rehabilitation exercise robot"],
    skills: ["Biomedical sensors", "Embedded C", "CAD", "Signal processing", "Medical device safety"],
    roles: ["Medical robotics engineer", "Biomedical device engineer", "Lab automation specialist"],
  },
  {
    key: "agri",
    name: "Agricultural",
    tag: "Farm robots, drones, irrigation",
    aliases: ["agricultural", "agriculture", "agri", "farm", "food technology", "food"],
    line: "Farm robots, spraying drones, automatic irrigation and sorting machines bring automation to the field.",
    layers: [0, 2, 4],
    builds: ["Automatic drip irrigation with soil sensors", "A spraying drone or field rover", "A fruit-sorting machine with a camera"],
    skills: ["Drones", "IoT", "Sensors", "Machine vision", "Precision farming"],
    roles: ["Agri-tech engineer", "Farm automation engineer", "Drone operations engineer"],
  },
];

const ALL = [...FEATURED, ...MORE];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Branches whose name or a known short form matches what was typed. Short forms (4 letters or fewer) match whole words only. */
function matchBranches(q: string): Branch[] {
  const t = norm(q);
  if (t.length < 2) return [];
  const words = t.split(/[\s,/()-]+/).filter(Boolean);
  return ALL.filter((b) =>
    [b.name, ...b.aliases].some((a) => {
      const x = norm(a);
      if (x.length <= 4) return words.includes(x) || t === x;
      return x.includes(t) || t.includes(x);
    }),
  );
}

function Stack({ lit, open }: { lit: number[]; open: boolean }) {
  return (
    <ol className="grid gap-2" aria-label="Where the branch fits in a robot or an automated line">
      {[...LAYERS.keys()].reverse().map((i) => {
        const on = open || lit.includes(i);
        return (
          <li
            key={LAYERS[i].name}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors duration-500 ${on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink"}`}
          >
            <span className={`readout flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${on ? "bg-white/10 text-go" : "bg-mist text-ink2"}`}>{`0${i + 1}`}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold leading-tight">{LAYERS[i].name}</span>
              <span className={`block text-sm ${on ? "text-white/70" : "text-ink2"}`}>{LAYERS[i].parts}</span>
            </span>
            <span
              className={`hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold sm:inline-flex ${on ? "bg-go text-white" : "bg-mist text-ink2"}`}
            >
              {on ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                  {open ? "Open to you" : "Your core"}
                </>
              ) : (
                "Team up"
              )}
            </span>
            <span className="sr-only">{on ? (open ? "open to you" : "your core") : "you work with other branches here"}</span>
          </li>
        );
      })}
    </ol>
  );
}

function List({ title, items, icon }: { title: string; items: string[]; icon: string }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon name={icon} size={16} className="text-go-deep" />
        {title}
      </p>
      <ul className="mt-2 grid gap-1.5 text-[0.95rem] text-ink2">
        {items.map((x) => (
          <li key={x} className="flex gap-2">
            <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-go" aria-hidden="true" />
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BranchFinder() {
  const [selKey, setSelKey] = useState<string>("ra");
  const [typed, setTyped] = useState("");
  const [custom, setCustom] = useState<string | null>(null);
  const inputId = useId();
  const answer = useRef<HTMLDivElement>(null);
  const matches = useMemo(() => matchBranches(typed), [typed]);

  /** On phones and tablets the answer sits below the choices: bring it into view after a choice. */
  const reveal = () => {
    if (typeof window === "undefined" || window.matchMedia("(min-width: 1024px)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => answer.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
  };

  const sel = custom == null ? ALL.find((b) => b.key === selKey) ?? FEATURED[0] : null;
  const pick = (k: string) => {
    setSelKey(k);
    setCustom(null);
    reveal();
  };
  const submitTyped = () => {
    const t = typed.trim();
    if (!t) return;
    const exact = ALL.find((b) => [b.name, ...b.aliases].some((a) => norm(a) === norm(t)));
    if (exact) pick(exact.key);
    else if (matches.length === 1) pick(matches[0].key);
    else {
      setCustom(t.slice(0, 80));
      reveal();
    }
  };

  const tile = (b: Branch, small = false) => {
    const on = custom == null && b.key === selKey;
    return small ? (
      <button
        key={b.key}
        type="button"
        onClick={() => pick(b.key)}
        aria-pressed={on}
        className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`}
      >
        {b.name}
      </button>
    ) : (
      <button
        key={b.key}
        type="button"
        onClick={() => pick(b.key)}
        aria-pressed={on}
        className={`group flex h-full flex-col items-start rounded-2xl border p-4 text-left transition-all duration-300 ${on ? "border-ink bg-ink text-white shadow-[var(--shadow-lift)]" : "border-line bg-white hover:-translate-y-0.5 hover:border-ink"}`}
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span className="font-semibold leading-tight">{b.name}</span>
          <span className={`h-2 w-2 shrink-0 rounded-full ${on ? "bg-go" : "bg-line group-hover:bg-go"}`} aria-hidden="true" />
        </span>
        <span className={`mt-1 text-sm ${on ? "text-white/70" : "text-ink2"}`}>{b.tag}</span>
      </button>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] lg:gap-10">
      {/* Choose */}
      <div>
        <p className="text-sm font-semibold text-ink2">Suggested branches</p>
        <div className="mt-3 grid grid-cols-2 gap-2.5">{FEATURED.map((b) => tile(b))}</div>
        <p className="mt-6 text-sm font-semibold text-ink2">More branches</p>
        <div className="mt-3 flex flex-wrap gap-2">{MORE.map((b) => tile(b, true))}</div>

        <div className={`mt-6 rounded-2xl border p-4 transition-colors ${custom != null ? "border-ink" : "border-line"} bg-mist`}>
          <label htmlFor={inputId} className="font-semibold">
            Your branch is not listed? Type it.
          </label>
          <p className="mt-0.5 text-sm text-ink2">Any branch can form a GRAAS chapter. This list is only a guide.</p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submitTyped();
            }}
          >
            <input
              id={inputId}
              className="field min-w-0 flex-1 bg-white"
              value={typed}
              maxLength={80}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="For example Textile, Mining, Marine, Metallurgy"
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary shrink-0 !px-5">
              Show
            </button>
          </form>
          {matches.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink2">Close match:</span>
              {matches.slice(0, 4).map((b) => (
                <button key={b.key} type="button" onClick={() => pick(b.key)} className="rounded-full border border-line bg-white px-3 py-1 font-medium hover:border-ink">
                  {b.name}
                </button>
              ))}
            </p>
          )}
        </div>
      </div>

      {/* Answer */}
      <div ref={answer} aria-live="polite" className="card scroll-mt-24 p-6 sm:p-8">
        {sel ? (
          <div key={sel.key} className="fade-up">
            <p className="flex items-center gap-2 text-sm font-semibold text-go-deep">
              <span className="dot" aria-hidden="true" />
              How your branch connects to robotics
            </p>
            <h3 className="h-card mt-2 !text-[clamp(1.5rem,1.1rem+1.2vw,2.1rem)]">{sel.name}</h3>
            <p className="mt-3 text-[1.05rem] text-ink2">{sel.line}</p>
            <p className="mt-6 text-sm font-semibold">Where {sel.name} fits in a robot or an automated line</p>
            <div className="mt-3">
              <Stack lit={sel.layers} open={false} />
            </div>
            <p className="mt-2 text-sm text-ink2">
              <span className="font-semibold text-ink">Your core</span> is where your branch leads. <span className="font-semibold text-ink">Team up</span> is where you work with
              other branches, and you can learn any of it in GRAAS.
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              <List title="Your chapter can build" items={sel.builds} icon="build" />
              <List title="Skills you grow" items={sel.skills} icon="learn" />
              <List title="Where it can lead" items={sel.roles} icon="briefcase" />
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/chapters/apply?kind=college" className="btn btn-primary">
                Start {/^[AEIOU]/.test(sel.name) ? "an" : "a"} {sel.name} chapter
              </Link>
              <Link href="/membership" className="btn btn-ghost">
                Join as a student
              </Link>
            </div>
          </div>
        ) : (
          <div key={"custom-" + custom} className="fade-up">
            <p className="flex items-center gap-2 text-sm font-semibold text-go-deep">
              <span className="dot" aria-hidden="true" />
              Every branch is welcome
            </p>
            <h3 className="h-card mt-2 break-words !text-[clamp(1.5rem,1.1rem+1.2vw,2.1rem)]">{custom}</h3>
            <p className="mt-3 text-[1.05rem] text-ink2">
              Robotics and automation now reach every field, from textiles and food to mining, ships and design. Your branch brings the knowledge of its own field, and
              GRAAS brings the robotics, the projects and the people.
            </p>
            <p className="mt-6 text-sm font-semibold">Every layer is open to you</p>
            <div className="mt-3">
              <Stack lit={[]} open />
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <List
                title="Your chapter can"
                items={["Automate one real task from your own field", "Enter robotics competitions with a mixed team", "Invite an industry speaker from your field"]}
                icon="build"
              />
              <List
                title="When you apply"
                items={['Choose "Other" in the branch list', `Type "${custom}" as the branch name`, "Everything else works the same as any chapter"]}
                icon="check"
              />
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/chapters/apply?kind=college" className="btn btn-primary">
                Start a chapter for your branch
              </Link>
              <Link href="/contact" className="btn btn-ghost">
                Ask GRAAS
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
