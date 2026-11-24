import Link from "next/link";

const RULES = [
  { t: "Who can join", d: "Students of every level, professionals, institutions and companies. Students under 18 join with a parent's or guardian's agreement." },
  { t: "When membership starts", d: "The moment your payment is confirmed. Institution and industry applications are verified by GRAAS first." },
  { t: "How long it lasts", d: "For the period of your plan, counted from the day it starts. Renewal opens 60 days before the end, and you keep your member number." },
  { t: "How fees are paid", d: "Only online, through Razorpay on this website. Staff and chapters never collect membership fees in cash." },
  { t: "When fees are refunded", d: "In full for a duplicate charge, a declined application, or a payment that did not activate your membership. Not after a membership is active." },
  { t: "What we expect", d: "Honest work, respect for people and care for safety. A serious breach of the code of conduct can suspend a membership." },
];
const LINKS = [
  ["membership-rules", "Membership rules"],
  ["code-of-conduct", "Code of conduct"],
  ["refund-policy", "Refund and cancellation"],
  ["terms", "Terms of use"],
  ["privacy", "Privacy policy"],
];

export default function RulesGlance() {
  return (
    <section id="rules" className="section">
      <div className="shell grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.8fr)] lg:gap-10">
        <div>
          <h2 className="h-section">The rules, in plain words.</h2>
          <p className="lede mt-4">Six things every member should know before joining. The full text is one click away.</p>
          <ul className="mt-8 grid gap-1 border-t border-line pt-4">
            {LINKS.map(([slug, name]) => (
              <li key={slug}>
                <Link href={`/policies/${slug}`} className="group flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 font-semibold transition-colors hover:bg-mist">
                  {name}
                  <span aria-hidden="true" className="dot transition-transform duration-300 group-hover:scale-150" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {RULES.map((r, i) => (
            <div key={r.t} className="card card-lift p-6">
              <span aria-hidden="true" className="flex h-8 items-end gap-1">
                {[0, 1, 2, 3].map((b) => (
                  <span key={b} className="w-2 rounded-t-[2px]" style={{ height: 10 + b * 6, background: b <= i % 4 ? ["#b7babf", "#8e919a", "#5a616b", "#000e21"][b] : "#e2e4e9" }} />
                ))}
              </span>
              <dt className="h-card mt-4">{r.t}</dt>
              <dd className="mt-2 text-ink2">{r.d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
