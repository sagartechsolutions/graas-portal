import Link from "next/link";
import { getGraascon, getPlans } from "@/lib/data";
import { TRACKS } from "@/lib/site";
import Gears from "@/components/fx/Gears";

/* Track crates riding a conveyor. Pauses when a pointer or keyboard focus is on it. */
export function Conveyor() {
  const crates = [...TRACKS, ...TRACKS];
  return (
    <section aria-label="Learning tracks" className="belt overflow-hidden border-b-2 border-ink bg-surface pt-7">
      <p className="mx-auto max-w-[1320px] px-5 pb-4 text-sm font-semibold text-ink2 sm:px-8">Tracks coming down the line at launch</p>
      <div className="belt-track">
        {crates.map((t, i) => (
          <span
            key={i}
            aria-hidden={i >= TRACKS.length}
            className="wide mr-4 inline-flex h-14 items-center whitespace-nowrap rounded-md border-2 border-ink bg-cobalt-soft px-6 text-lg"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="belt-rollers mt-1.5 h-4 border-y-2 border-ink bg-paper" aria-hidden="true" />
    </section>
  );
}

const inr = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
const term = (m: number | null) => (m === null ? "lifetime" : m === 12 ? "per year" : m % 12 === 0 ? `for ${m / 12} years` : `for ${m} months`);

export async function Plans({ heading = true }: { heading?: boolean }) {
  const plans = await getPlans();
  return (
    <section id="membership" className="border-y-2 border-ink bg-surface">
      <div className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 lg:py-24">
        {heading && (
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="display text-6xl sm:text-7xl lg:text-8xl">Membership</h2>
              <p className="lede mt-5">
                A free account lets you attend open lectures and follow events. Membership adds a verified ID, a
                certificate and member pricing.
              </p>
            </div>
            <Gears className="hidden shrink-0 md:block" />
          </div>
        )}
        <ul className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-4 ${heading ? "mt-12" : ""}`}>
          {plans.map((p) => (
            <li key={p.code} className="plate flex flex-col p-6">
              <h3 className="display text-5xl">{p.name}</h3>
              {p.tagline && <p className="mt-2 min-h-[2.6rem] text-sm text-ink2">{p.tagline}</p>}
              <p className="mt-5 min-h-[3.2rem]">
                {p.price_inr === null ? (
                  <span className="inline-block rounded-md bg-hazard px-2.5 py-1 text-sm font-bold">Fee to be announced</span>
                ) : (
                  <>
                    <span className="display text-5xl">₹{inr(p.price_inr)}</span>{" "}
                    <span className="text-sm font-semibold text-ink2">
                      {term(p.duration_months)}
                      {p.gst_percent > 0 ? ` + ${p.gst_percent}% GST` : ""}
                    </span>
                  </>
                )}
              </p>
              <ul className="mt-4 grid gap-2.5 text-[0.95rem]">
                {p.benefits.map((b) => (
                  <li key={b} className="flex gap-2.5">
                    <svg width="18" height="18" viewBox="0 0 18 18" className="mt-0.5 shrink-0" aria-hidden="true">
                      <path d="M3 9.5 L7.2 13.5 L15 4.5" fill="none" stroke="#1f3fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {b}
                  </li>
                ))}
              </ul>
              {p.requires_approval && <p className="mt-4 text-sm text-ink2">Applications are verified before payment.</p>}
              <div className="mt-auto pt-6">
                <Link href="/#pre-register" className="btn btn-quiet !min-h-11 !py-2">
                  Pre-register
                </Link>
              </div>
            </li>
          ))}
        </ul>
        {plans.length === 0 && <p className="mt-10 text-ink2">Membership plans will be published here shortly.</p>}
      </div>
    </section>
  );
}

export async function GraasconBand() {
  const g = await getGraascon();
  return (
    <section className="bg-ink text-white">
      <div className="hazard h-2.5" aria-hidden="true" />
      <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-20 sm:px-8 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:py-24">
        <h2 className="display text-[clamp(4rem,13vw,10rem)]">
          GRAASCON <span className="text-hazard">{g.year}</span>
        </h2>
        <div>
          <p className="text-lg leading-relaxed text-white/80">
            The first GRAAS conference on robotics and automation: research papers, industry demonstrations and student
            projects under one roof. {g.dates ? `${g.dates}${g.venue ? `, ${g.venue}` : ""}.` : "Dates and venue will be announced here."}
          </p>
          <Link href="/graascon" className="btn btn-go mt-7">
            About GRAASCON
          </Link>
        </div>
      </div>
    </section>
  );
}
