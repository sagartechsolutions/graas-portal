"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import Icon, { IconTile } from "@/components/ui/Icon";
import Photo from "@/components/ui/Photo";
import type { Term } from "@/lib/data";
import type { MemberType } from "@/lib/benefits";
import { PHOTOS } from "@/lib/photos";
import type { Plan } from "@/lib/site";
import { rupees, termPrice } from "./price";

function PriceBox({ t, plan, terms, freeSeats, seatFee }: { t: MemberType; plan?: Plan; terms: Term[]; freeSeats: number; seatFee: number | null }) {
  if (t.key === "school")
    return (
      <div className="rounded-2xl bg-go-soft p-5">
        <p className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tracking-tight text-go-deep">Free</span>
          <span className="text-sm font-medium text-go-deep">every year, while at school</span>
        </p>
        <p className="mt-2 text-sm text-ink2">{plan?.how_to_join ?? "Through the school's GRAAS chapter."}</p>
      </div>
    );
  if (t.key === "chapter")
    return (
      <div className="rounded-2xl bg-go-soft p-5">
        <p className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tracking-tight text-go-deep">{freeSeats} free</span>
          <span className="text-sm font-medium text-go-deep">student memberships to start</span>
        </p>
        <p className="mt-2 text-sm text-ink2">
          No fee to form a chapter. Students beyond {freeSeats} join at {seatFee ? `${rupees(seatFee)} a year` : "the Student fee"}, paid by the chapter in one payment or by each student.
        </p>
      </div>
    );
  if (!plan) return null;
  if (plan.price_inr === null) return <p className="rounded-2xl bg-mist p-5 font-semibold text-ink2">Fee to be announced</p>;
  const price = Number(plan.price_inr);
  const longer = plan.duration_months === 12 ? terms.filter((x) => x.years > 1) : [];
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-4xl font-semibold tracking-tight">{rupees(price)}</span>
        <span className="text-sm text-ink2">per year{plan.gst_percent > 0 ? ` + ${plan.gst_percent}% GST` : ""}</span>
      </p>
      {longer.length > 0 && (
        <div className="mt-3 grid gap-1.5 border-t border-line pt-3 text-sm">
          <p className="font-semibold">Pay once and save</p>
          {longer.map((x) => {
            const total = termPrice(price, x);
            return (
              <p key={x.years} className="flex items-center justify-between gap-3">
                <span className="text-ink2">{x.label}</span>
                <span className="flex items-center gap-2">
                  <span className="readout font-semibold">{rupees(total)}</span>
                  {Number(x.discount_percent) > 0 && <span className="rounded-full bg-go-soft px-2 py-0.5 text-xs font-semibold text-go-deep">save {rupees(price * x.years - total)}</span>}
                </span>
              </p>
            );
          })}
        </div>
      )}
      {plan.requires_approval && <p className="mt-3 text-sm text-ink2">GRAAS verifies the application before payment.</p>}
    </div>
  );
}

/** Every kind of membership, one at a time: who it is for, what it costs, every benefit, what to have ready and how to join. */
export default function TypeExplorer({ types, plans, terms, freeSeats, seatFee }: { types: MemberType[]; plans: Plan[]; terms: Term[]; freeSeats: number; seatFee: number | null }) {
  const [key, setKey] = useState<MemberType["key"]>("student");
  const reduce = useReducedMotion();
  useEffect(() => {
    const pick = () => {
      const h = window.location.hash.replace("#", "");
      if (types.some((t) => t.key === h)) setKey(h as MemberType["key"]);
    };
    pick();
    window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
  }, [types]);
  const t = types.find((x) => x.key === key) ?? types[0];
  const plan = plans.find((p) => p.code === t.plan);
  const choose = (k: MemberType["key"]) => {
    setKey(k);
    window.history.replaceState(null, "", `#${k}`);
  };

  return (
    <div id="types" className="scroll-mt-24">
      {types.map((x) => (
        <span key={x.key} id={x.key} className="block scroll-mt-28" aria-hidden="true" />
      ))}
      <div role="tablist" aria-label="Kinds of membership" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 sm:flex-wrap">
        {types.map((x) => {
          const on = x.key === key;
          const p = plans.find((pp) => pp.code === x.plan);
          const price = x.key === "school" ? "Free" : x.key === "chapter" ? `${freeSeats} seats free` : p?.price_inr != null ? `${rupees(Number(p.price_inr))}/yr` : "";
          return (
            <button
              key={x.key}
              role="tab"
              type="button"
              aria-selected={on}
              onClick={() => choose(x.key)}
              className={`group flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${on ? "border-ink bg-ink text-white shadow-[var(--shadow-lift)]" : "border-line bg-white hover:border-slate3"}`}
            >
              <span aria-hidden="true" className="flex h-7 items-end">
                <span className="block w-2.5 rounded-t-[2px] transition-all" style={{ height: x.bar, background: on ? (x.key === "industry" ? "#02ae3e" : "#fff") : x.tone }} />
              </span>
              <span>
                <span className="block font-semibold leading-tight">{x.name}</span>
                <span className={`block text-sm ${on ? "text-white/70" : "text-ink2"}`}>{price}</span>
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={t.key}
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          role="tabpanel"
          className="card mt-4 grid gap-6 overflow-hidden p-4 sm:p-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)] lg:gap-8 lg:p-8"
        >
          <div className="grid content-start gap-5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[20px]">
              <Photo src={PHOTOS[t.photo].src} alt={PHOTOS[t.photo].alt} sizes="(min-width: 1024px) 40vw, 100vw" className="kenburns h-full w-full" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
              <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-3 text-white">
                <div>
                  <p className="text-sm text-white/75">{t.key === "chapter" ? "Chapter number" : "Member number"}</p>
                  <p className="readout text-lg font-medium tracking-wide">GRAAS-{t.series}-26-{t.key === "chapter" ? "0001" : "00001"}</p>
                </div>
                <IconTile name={t.icon} tone="green" />
              </div>
            </div>
            <div>
              <h3 className="h-card !text-[clamp(1.6rem,1.3rem+0.8vw,2.1rem)]">{t.name}{t.key === "chapter" ? "" : " membership"}</h3>
              <p className="mt-1.5 font-medium">{t.who}</p>
              <p className="mt-2 text-ink2">{t.promise}</p>
            </div>
            <PriceBox t={t} plan={plan} terms={terms} freeSeats={freeSeats} seatFee={seatFee} />
            <div className="flex flex-wrap gap-3">
              <Link href={t.cta.href} className="btn btn-primary">
                {t.cta.label}
              </Link>
              {t.key === "school" || t.key === "chapter" ? (
                <Link href="/chapters" className="btn btn-ghost">
                  How chapters work
                </Link>
              ) : (
                <a href="#compare" className="btn btn-ghost">
                  Compare all
                </a>
              )}
            </div>
          </div>

          <div className="grid content-start gap-5">
            <ul className="grid gap-4 sm:grid-cols-2">
              {t.groups.map((g, i) => (
                <motion.li
                  key={g.title}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * i + 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className={`rounded-2xl border border-line p-5 ${i === 0 ? "bg-mist sm:col-span-2" : "bg-white"}`}
                >
                  <div className="flex items-center gap-3">
                    <IconTile name={g.icon} tone={i === 0 ? "ink" : "green"} size={20} />
                    <h4 className="text-lg font-semibold leading-tight">{g.title}</h4>
                  </div>
                  <ul className={`mt-3 grid gap-2 text-[0.96rem] ${i === 0 ? "sm:grid-cols-2 sm:gap-x-6" : ""}`}>
                    {g.items.map((it) => (
                      <li key={it} className="flex items-start gap-2.5">
                        <Icon name="check" size={16} strokeWidth={2.4} className="mt-1 shrink-0 text-go-deep" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </motion.li>
              ))}
            </ul>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-dashed border-slate3 p-5">
                <p className="flex items-center gap-2 font-semibold">
                  <Icon name="grid" size={18} /> What to have ready
                </p>
                <ul className="mt-2.5 grid gap-1.5 text-[0.95rem] text-ink2">
                  {t.needs.map((n) => (
                    <li key={n}>• {n}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-ink p-5 text-white">
                <p className="flex items-center gap-2 font-semibold">
                  <Icon name="clock" size={18} /> How to join
                </p>
                <ol className="mt-2.5 grid gap-2 text-[0.95rem]">
                  {t.steps.map((s, i) => (
                    <li key={s} className="flex items-start gap-2.5">
                      <span className="readout mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs">{i + 1}</span>
                      <span className="text-white/85">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            {t.note && <p className="rounded-2xl bg-go-soft px-5 py-3.5 text-[0.95rem] font-medium text-go-deep">{t.note}</p>}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
