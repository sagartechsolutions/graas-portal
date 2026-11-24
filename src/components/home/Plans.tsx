import { getPlans, getTerms, type Term } from "@/lib/data";
import type { Plan } from "@/lib/site";
import Link from "next/link";

const inr = (n: number) => new Intl.NumberFormat("en-IN").format(n);
const term = (m: number | null) => (m === null ? "one time" : m === 12 ? "per year" : m % 12 === 0 ? `for ${m / 12} years` : `for ${m} months`);
const TONE: Record<Plan["audience"], string> = { student: "#b7babf", professional: "#8e919a", institution: "#5a616b", industry: "#000e21" };
const HEIGHT: Record<Plan["audience"], number> = { student: 14, professional: 20, institution: 26, industry: 32 };

/** Same arithmetic as the database quote: full price for the years, less the term discount, in paise. */
function termPrice(priceInr: number, t: Term) {
  const full = Math.round(priceInr * 100) * t.years;
  return (full - Math.round((full * t.discount_percent) / 100)) / 100;
}

/** Membership plans straight from the database. Fees are set by staff in admin; until then the card says so. */
export default async function Plans({ heading = true }: { heading?: boolean }) {
  const [plans, terms] = await Promise.all([getPlans(), getTerms()]);
  const longer = terms.filter((t) => t.years > 1);
  return (
    <section id="plans" className={heading ? "section" : "pb-20"}>
      <div className="shell">
        {heading && (
          <div className="max-w-3xl">
            <h2 className="h-section">A membership for where you are.</h2>
            <p className="lede mt-4">Four ways to join. Each fee is shown here and again before you pay.</p>
          </div>
        )}
        <ul className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-4 ${heading ? "mt-12" : ""}`}>
          {plans.map((p) => (
            <li key={p.code} className="card card-lift flex flex-col p-6 sm:p-7">
              <span aria-hidden="true" className="flex h-8 items-end">
                <span className="block w-3 rounded-t-[3px]" style={{ height: HEIGHT[p.audience], background: TONE[p.audience] }} />
              </span>
              <h3 className="h-card mt-4">{p.name}</h3>
              {p.tagline && <p className="mt-1.5 min-h-[2.8rem] text-[0.95rem] text-ink2">{p.tagline}</p>}
              <p className="mt-5 flex min-h-[3.4rem] flex-wrap items-baseline gap-x-2 border-y border-line py-3">
                {p.price_inr === null ? (
                  <span className="text-[0.95rem] font-semibold text-ink2">Fee to be announced</span>
                ) : (
                  <>
                    <span className="text-3xl font-semibold tracking-tight">₹{inr(p.price_inr)}</span>
                    <span className="text-sm text-ink2">
                      {term(p.duration_months)}
                      {p.gst_percent > 0 ? ` + ${p.gst_percent}% GST` : ""}
                    </span>
                  </>
                )}
              </p>
              {p.price_inr !== null && Number(p.price_inr) > 0 && p.duration_months === 12 && longer.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold">Pay once and save</p>
                  <table className="mt-1.5 w-full text-sm">
                    <tbody>
                      {longer.map((t) => (
                        <tr key={t.years} className="border-b border-line/70 last:border-0">
                          <th scope="row" className="py-1.5 pr-2 text-left font-normal text-ink2">
                            {t.label}
                          </th>
                          <td className="readout py-1.5 text-right font-semibold">₹{inr(termPrice(Number(p.price_inr), t))}</td>
                          <td className="w-[4.5rem] py-1.5 pl-2 text-right">
                            {t.discount_percent > 0 && <span className="text-xs font-semibold text-go-deep">−{t.discount_percent}%</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <ul className="mt-5 grid gap-2.5 text-[0.95rem]">
                {p.benefits.map((b) => (
                  <li key={b} className="flex gap-2.5">
                    <svg width="18" height="18" viewBox="0 0 18 18" className="mt-0.5 shrink-0" aria-hidden="true">
                      <path d="M3.5 9.5 7.2 13 14.5 5" fill="none" stroke="#067a2e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {b}
                  </li>
                ))}
              </ul>
              {p.requires_approval && <p className="mt-4 text-sm text-ink2">Applications are verified before payment.</p>}
              {p.price_inr === null && <p className="mt-4 text-sm text-ink2">You can apply now and pay when the fee is announced.</p>}
              <div className="mt-auto pt-7">
                <Link href={`/join?plan=${p.code}`} className="btn btn-primary w-full !min-h-12">
                  Choose {p.name.toLowerCase()}
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
