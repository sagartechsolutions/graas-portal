"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

const STAGES = [
  { name: "Learn", text: "Live lectures and courses, from first principles to PLCs, ROS and machine vision.", h: 58, bg: "#b7babf", fg: "#000e21" },
  { name: "Build", text: "Form a chapter, share a bench with classmates and finish projects as a team.", h: 72, bg: "#8e919a", fg: "#000e21" },
  { name: "Compete", text: "Take your robot to workshops, challenges and inter-college competitions.", h: 86, bg: "#5a616b", fg: "#ffffff" },
  { name: "Lead", text: "Run your chapter, mentor juniors and solve problems that companies post.", h: 100, bg: "#000e21", fg: "#ffffff" },
];

/** The logo, built out of what a member does: four bars rising to the green dot. */
export default function Climb() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-25% 0px" });
  const reduce = useReducedMotion();
  const on = inView || !!reduce;

  return (
    <section className="section overflow-hidden">
      <div className="shell">
        <div className="grid gap-5 lg:grid-cols-2 lg:items-end lg:gap-16">
          <h2 className="h-section">The GRAAS logo is the member’s path.</h2>
          <p className="lede lg:justify-self-end">Four bars, each taller than the last, with a green dot at the peak. Read left to right, it is what a member does.</p>
        </div>

        <div ref={ref} className="mt-20 sm:mt-24">
          <div className="relative flex h-[230px] items-end gap-2.5 sm:h-[360px] sm:gap-4 lg:h-[470px] lg:gap-5 2xl:h-[580px]">
            {STAGES.map((s, i) => (
              <div key={s.name} className="relative flex h-full flex-1 items-end">
                {i === 3 && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute left-1/2 top-0 -ml-[14px] -mt-10 block h-7 w-7 rounded-full bg-go sm:-ml-[22px] sm:-mt-14 sm:h-11 sm:w-11"
                    initial={false}
                    animate={on ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 14, delay: reduce ? 0 : 1.25 }}
                  />
                )}
                <motion.div
                  className="w-full origin-bottom [--tip:26px] sm:[--tip:48px] lg:[--tip:72px]"
                  style={{ height: `${s.h}%`, background: s.bg, color: s.fg, clipPath: "polygon(0 var(--tip), 50% 0, 100% var(--tip), 100% 100%, 0 100%)" }}
                  initial={false}
                  animate={on ? { scaleY: 1 } : { scaleY: 0 }}
                  transition={{ duration: reduce ? 0 : 0.95, delay: reduce ? 0 : i * 0.16, ease: [0.16, 1, 0.3, 1] }}
                >
                  <motion.div className="hidden h-full flex-col justify-end p-5 sm:flex lg:p-7" initial={false} animate={on ? { opacity: 1 } : { opacity: 0 }} transition={{ duration: 0.5, delay: reduce ? 0 : 0.55 + i * 0.16 }}>
                    <h3 className="text-2xl font-semibold tracking-tight lg:text-[2rem]">{s.name}</h3>
                    <p className="mt-2 hidden max-w-[22rem] leading-snug opacity-85 lg:block">{s.text}</p>
                  </motion.div>
                </motion.div>
              </div>
            ))}
          </div>
          <div className="relative mt-2 h-1.5 rounded-full bg-ink sm:mt-3 sm:h-2">
            <svg aria-hidden="true" className="rover hidden sm:block" width="58" height="30" viewBox="0 0 58 30">
              <rect x="6" y="6" width="44" height="14" rx="5" fill="#fff" stroke="#000e21" strokeWidth="2" />
              <rect x="34" y="1" width="9" height="6" rx="2" fill="#000e21" />
              <circle cx="46" cy="13" r="3" fill="#02ae3e" />
              <g className="wheel"><circle cx="16" cy="23" r="6" fill="#000e21" /><rect x="15" y="18" width="2" height="10" fill="#8e919a" /></g>
              <g className="wheel"><circle cx="41" cy="23" r="6" fill="#000e21" /><rect x="40" y="18" width="2" height="10" fill="#8e919a" /></g>
            </svg>
          </div>

          <dl className="mt-8 grid gap-5 sm:grid-cols-2 lg:hidden">
            {STAGES.map((s) => (
              <div key={s.name} className="flex gap-4">
                <span aria-hidden="true" className="mt-1.5 h-4 w-2.5 shrink-0 rounded-t-[2px]" style={{ background: s.bg }} />
                <div>
                  <dt className="text-lg font-semibold">{s.name}</dt>
                  <dd className="text-ink2">{s.text}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
