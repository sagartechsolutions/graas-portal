import Link from "next/link";
import { EventCard } from "@/components/events/EvBits";
import { SectionHead } from "@/components/sections/Blocks";
import { getEvents } from "@/lib/data";

/** Home page: the next sessions, or what members can expect when none are scheduled yet. */
export default async function EventsBand() {
  const items = (await getEvents()).filter((e) => !e.past).slice(0, 4);
  return (
    <section className="section">
      <div className="shell grid gap-8">
        <SectionHead
          kicker="Events and live sessions"
          title="Learn live. Free or discounted for members."
          intro="Webinars, industry-leader lectures, workshops, chapter competitions and industrial visits, with a certificate for every attendee."
          action={
            <div className="flex flex-wrap gap-2">
              <Link href="/events" className="btn btn-primary">
                See all events
              </Link>
              <Link href="/experts" className="btn btn-ghost">
                Host a session
              </Link>
            </div>
          }
        />
        {items.length > 0 ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {items.map((e) => (
              <li key={e.id}>
                <EventCard e={e} href={`/events/${String(e.ref).toLowerCase()}`} />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Industry-leader lectures", "Plant heads and automation leads on real projects and careers."],
              ["Live sessions", "Hands-on online classes on PLC, ROS, vision and IoT."],
              ["Chapter competitions", "College and school teams compete for prizes and certificates."],
              ["Workshops and visits", "Build in a lab, or walk a real shop floor."],
            ].map(([t, d]) => (
              <li key={t} className="card p-5">
                <p className="text-lg font-semibold">{t}</p>
                <p className="mt-1 text-ink2">{d}</p>
                <p className="mt-3 text-sm font-semibold text-go-deep">First sessions being scheduled</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
