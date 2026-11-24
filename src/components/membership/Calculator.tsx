"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { Term } from "@/lib/data";
import type { Plan } from "@/lib/site";
import { rupees, termPrice } from "./price";

/** Choose a membership and a length, and see the price, the saving and the end date before joining. */
export default function Calculator({ plans, terms }: { plans: Plan[]; terms: Term[] }) {
  const paid = plans.filter((p) => p.self_join !== false && p.price_inr !== null && Number(p.price_inr) > 0);
  const [code, setCode] = useState(paid[0]?.code ?? "");
  const [years, setYears] = useState(terms.find((t) => t.years === 3)?.years ?? terms[0]?.years ?? 1);
  // Today's date is read in the browser, after the page loads.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    Promise.resolve().then(() => setNow(Date.now()));
  }, []);
  const plan = paid.find((p) => p.code === code) ?? paid[0];
  const term = terms.find((t) => t.years === years) ?? terms[0];
  const r = (() => {
    if (!plan || !term) return null;
    const yearly = Number(plan.price_inr);
    const total = termPrice(yearly, term);
    const full = yearly * term.years;
    let endText = "—";
    if (now !== null) {
      const end = new Date(now);
      end.setFullYear(end.getFullYear() + term.years);
      end.setDate(end.getDate() - 1);
      endText = end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }
    return { total, perYear: total / term.years, save: full - total, full, end: endText };
  })();
  if (!plan || !term || !r) return null;
  return (
    <div className="grid overflow-hidden rounded-[28px] border border-line bg-white shadow-[var(--shadow-card)] lg:grid-cols-[1.1fr_1fr]">
      <div className="grid content-start gap-6 p-6 sm:p-8">
        <fieldset>
          <legend className="text-sm font-semibold text-slate7">1. Your membership</legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {paid.map((p) => (
              <button key={p.code} type="button" onClick={() => setCode(p.code)} aria-pressed={p.code === plan.code} className={`rounded-full border px-4 py-2 text-[0.95rem] font-semibold transition-colors ${p.code === plan.code ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>
                {p.name}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold text-slate7">2. How long</legend>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {terms.map((t) => (
              <button key={t.years} type="button" onClick={() => setYears(t.years)} aria-pressed={t.years === term.years} className={`relative rounded-2xl border px-3 py-3 text-left transition-all ${t.years === term.years ? "border-ink bg-mist shadow-[var(--shadow-card)]" : "border-line hover:border-slate3"}`}>
                <span className="block font-semibold">{t.label}</span>
                <span className="block text-sm text-ink2">{Number(t.discount_percent) > 0 ? `${t.discount_percent}% off` : "Full price"}</span>
                {t.years === term.years && <span aria-hidden="true" className="dot absolute right-3 top-3" />}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="text-sm text-ink2">Paid once, online. {plan.requires_approval ? "GRAAS verifies institutions and companies before payment. " : ""}Prices are the ones shown again before you pay.</p>
      </div>
      <div className="relative overflow-hidden bg-ink p-6 text-white sm:p-8">
        <div aria-hidden="true" className="grid-faint pointer-events-none absolute inset-0 opacity-[0.08] invert" />
        <div className="relative">
          <p className="text-sm text-white/60">
            {plan.name} membership, {term.label.toLowerCase()}
          </p>
          <AnimatePresence mode="popLayout">
            <motion.p key={`${plan.code}-${term.years}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="readout mt-2 text-5xl font-medium tracking-tight sm:text-6xl">
              {rupees(r.total)}
            </motion.p>
          </AnimatePresence>
          <dl className="mt-6 grid gap-3 border-t border-white/15 pt-5 text-[0.95rem]">
            <div className="flex justify-between gap-4">
              <dt className="text-white/65">Works out at</dt>
              <dd className="readout">{rupees(r.perYear)} a year</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/65">Paying every year instead</dt>
              <dd className="readout">{rupees(r.full)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/65">You save</dt>
              <dd className="readout font-semibold text-go">{r.save > 0 ? rupees(r.save) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/65">If you join today, valid until</dt>
              <dd className="readout">{r.end}</dd>
            </div>
          </dl>
          <Link href={`/join?plan=${plan.code}`} className="btn btn-light mt-7 w-full">
            Join as {plan.name.toLowerCase()}
          </Link>
          <p className="mt-3 text-center text-sm text-white/55">You choose the length on the payment screen.</p>
        </div>
      </div>
    </div>
  );
}
