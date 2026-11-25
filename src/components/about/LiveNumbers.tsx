"use client";

import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/browser";

/* Live member numbers, counted from GRAAS records when the page opens. Shown only when staff switch them on
   in Admin, Settings, Membership. */

type Stats = { show: boolean; students?: number; school_students?: number; professionals?: number; institutions?: number; industries?: number; chapters?: number; as_of?: string };

function Count({ to }: { to: number }) {
  const [n, setN] = useState(0);
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const run = () => {
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 1400);
        setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        run();
        io.disconnect();
      }
    });
    if (el.current) io.observe(el.current);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return <span ref={el}>{n.toLocaleString("en-IN")}</span>;
}

export default function LiveNumbers() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    browserClient()
      .rpc("public_stats")
      .then(({ data, error }) => setS(error ? { show: false } : (data as Stats)));
  }, []);
  if (!s?.show) return null;
  const tiles: [string, number][] = [
    ["Students", s.students ?? 0],
    ["School students", s.school_students ?? 0],
    ["Professionals", s.professionals ?? 0],
    ["Institutions", s.institutions ?? 0],
    ["Industries", s.industries ?? 0],
    ["Chapters", s.chapters ?? 0],
  ];
  return (
    <section className="section !py-10 bg-ink text-white">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-[#7fe0a0]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-go" aria-hidden="true" /> Live from GRAAS records
            </p>
            <h2 className="mt-1 text-[clamp(1.5rem,1.1rem+1.2vw,2.2rem)] font-semibold tracking-tight">The GRAAS network today</h2>
          </div>
          <p className="text-sm text-white/60">Active members and approved chapters, counted as this page opened.</p>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {tiles.map(([label, v]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <dd className="readout text-[clamp(1.8rem,1.4rem+1.2vw,2.6rem)] font-medium tracking-tight">
                <Count to={v} />
              </dd>
              <dt className="mt-1 text-sm text-white/70">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
