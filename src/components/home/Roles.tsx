"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";

const ROLES = [
  {
    kind: "student",
    tab: "Student",
    line: "Graduate with projects, not just marks.",
    points: ["Join live lectures and earn certificates", "Run or join the chapter in your college", "Compete in team challenges", "Apply for internships and jobs with your GRAAS profile"],
  },
  {
    kind: "professional",
    tab: "Professional",
    line: "Stay sharp, and bring the next batch up with you.",
    points: ["Advanced sessions and technical communities", "Speak, mentor or judge at GRAAS programmes", "Meet collaborators and hire from the member base", "Carry a verified member ID"],
  },
  {
    kind: "college",
    tab: "College",
    line: "Give your students a robotics culture, not one more club.",
    points: ["Verified institute profile", "A chapter led by a faculty coordinator", "Membership for a whole batch in one step", "Activity reports for your department"],
  },
  {
    kind: "school",
    tab: "School",
    line: "Start them early, and keep parents in the loop.",
    points: ["A teacher-coordinator account for the school", "Parent consent handled inside the portal", "Beginner robotics lessons and a monthly STEM challenge", "A dashboard of what your students finished"],
  },
  {
    kind: "industry",
    tab: "Industry",
    line: "Meet the engineers you will want to hire, a year early.",
    points: ["Post jobs and internships to members", "Publish an automation problem for student teams", "Offer guest lectures and industrial visits", "Sponsor events and competitions"],
  },
];

export default function Roles() {
  const [i, setI] = useState(0);
  const card = useRef<HTMLDivElement>(null);
  const r = ROLES[i];

  // The panel leans toward the pointer, like a part held in a fixture. Disabled for touch and reduced motion.
  function tilt(e: React.PointerEvent) {
    const el = card.current;
    if (!el || e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const b = el.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`;
  }
  const untilt = () => card.current && (card.current.style.transform = "");

  function choose() {
    window.dispatchEvent(new CustomEvent("graas:kind", { detail: r.kind }));
    document.getElementById("pre-register")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 lg:py-24">
      <h2 className="display text-6xl sm:text-7xl lg:text-8xl">Which seat is yours?</h2>
      <div role="tablist" aria-label="Who you are" className="mt-9 flex flex-wrap gap-2.5">
        {ROLES.map((x, k) => (
          <button
            key={x.kind}
            role="tab"
            type="button"
            aria-selected={k === i}
            aria-controls="role-panel"
            onClick={() => setI(k)}
            className={`wide min-h-11 rounded-full border-[1.5px] border-ink px-5 py-2 transition-colors ${
              k === i ? "bg-ink text-white" : "bg-surface hover:bg-cobalt-soft"
            }`}
          >
            {x.tab}
          </button>
        ))}
      </div>
      <div
        ref={card}
        id="role-panel"
        role="tabpanel"
        onPointerMove={tilt}
        onPointerLeave={untilt}
        className="plate mt-7 overflow-hidden p-6 transition-transform duration-200 ease-out will-change-transform sm:p-10"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={r.kind}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.22, ease: [0.2, 0.9, 0.2, 1] }}
            className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center"
          >
            <div>
              <p className="display text-5xl sm:text-6xl">{r.line}</p>
              <button type="button" onClick={choose} className="btn btn-go mt-8">
                Pre-register as {r.tab.toLowerCase()}
              </button>
            </div>
            <ul className="grid gap-3 text-lg">
              {r.points.map((p) => (
                <li key={p} className="flex items-start gap-3 border-b border-line pb-3 last:border-0">
                  <span aria-hidden="true" className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-signal ring-2 ring-ink" />
                  {p}
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
