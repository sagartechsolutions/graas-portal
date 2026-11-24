"use client";

import Link from "next/link";
import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

const STEPS = [
  { title: "Choose a membership", text: "Student, professional, institution or industry. The fee for each is shown before you pay." },
  { title: "Create your account", text: "Your name, mobile number, email and a password. It takes about two minutes." },
  { title: "Pay online", text: "UPI, card or net banking through Razorpay. Institutions and companies are verified first." },
  { title: "Get your ID and certificate", text: "A member number, a digital ID with a QR code and a certificate, in your account at once." },
];

/** Four steps to membership. The highlight walks through them on its own and stops where the visitor points. */
export default function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-20% 0px" });
  const [at, setAt] = useState(0);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!inView || held || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setAt((v) => (v + 1) % STEPS.length), 2600);
    return () => clearInterval(id);
  }, [inView, held]);

  return (
    <section className="section bg-mist">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <h2 className="h-section">Four steps to membership.</h2>
            <p className="lede mt-4">Everything happens on this website. No forms to post, no cash to hand over.</p>
          </div>
          <Link href="/join" className="btn btn-primary">
            Become a member
          </Link>
        </div>
        <div ref={ref} className="relative mt-8" onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)}>
          <div aria-hidden="true" className="absolute left-0 right-0 top-[1.4rem] hidden h-0.5 bg-line lg:block">
            <div className="h-full bg-ink transition-[width] duration-700 ease-out" style={{ width: `${(at / (STEPS.length - 1)) * 100}%` }} />
          </div>
          <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => {
              const on = i === at, done = i < at;
              return (
                <li key={s.title} onPointerEnter={() => setAt(i)} onFocus={() => setAt(i)} tabIndex={0} className="relative outline-none">
                  <span className={`readout relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 text-base transition-colors duration-500 ${on || done ? "border-ink bg-ink text-white" : "border-line bg-white text-ink2"}`}>
                    {i + 1}
                    {on && <span aria-hidden="true" className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-go" />}
                  </span>
                  <div className={`card mt-5 h-[calc(100%-4rem)] p-6 transition-all duration-500 ${on ? "-translate-y-1 !border-ink shadow-[var(--shadow-lift)]" : ""}`}>
                    <h3 className="h-card">{s.title}</h3>
                    <p className="mt-2 text-ink2">{s.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
