import Link from "next/link";
import { OppCard } from "@/components/opps/OppBits";
import { SectionHead } from "@/components/sections/Blocks";
import { getOpportunities } from "@/lib/data";

/** Home page: the newest open opportunities, or what is coming if none are live yet. */
export default async function OpportunitiesBand() {
  const items = (await getOpportunities()).slice(0, 4);
  return (
    <section className="section bg-mist">
      <div className="shell grid gap-8">
        <SectionHead
          kicker="Opportunities"
          title="Jobs, internships and real problems to solve."
          intro="GRAAS member companies and institutions post roles, live projects, problem statements and challenges. Members apply with one profile; contact details stay private until both sides agree."
          action={
            <Link href="/opportunities" className="btn btn-primary">
              See all opportunities
            </Link>
          }
        />
        {items.length > 0 ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {items.map((o) => (
              <li key={o.id}>
                <OppCard o={o} href={`/opportunities/${String(o.ref).toLowerCase()}`} />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Jobs", "Roles in automation, controls, robotics and maintenance."],
              ["Internships", "Learn on real machines, usually with a stipend."],
              ["Problem statements", "Real shop-floor problems for student teams."],
              ["Challenges", "Competitions and hackathons with prizes."],
            ].map(([t, d]) => (
              <li key={t} className="card p-5">
                <p className="text-lg font-semibold">{t}</p>
                <p className="mt-1 text-ink2">{d}</p>
                <p className="mt-3 text-sm font-semibold text-go-deep">First posts arriving soon</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
