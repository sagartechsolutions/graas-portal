import type { Metadata } from "next";
import Link from "next/link";
import { FaqList, FeatureGrid, PageHero, SectionHead, StepsRail } from "@/components/sections/Blocks";

export const metadata: Metadata = {
  title: "Host a session",
  description: "Industry leaders, engineers and trainers can host webinars, live sessions, lectures and workshops on GRAAS for students and professionals in robotics and automation.",
};

export default function Page() {
  return (
    <>
      <PageHero
        kicker="For industry leaders, engineers and trainers"
        title={<>Teach what you know to India&apos;s next automation engineers.</>}
        intro={<>Host webinars, live classes, lectures and workshops on GRAAS. You bring the knowledge; GRAAS brings verified students and professionals, registration, payments, reminders and certificates.</>}
        photo="engineer"
        actions={
          <>
            <Link href="/studio" className="btn btn-primary">
              Apply to host
            </Link>
            <Link href="/events" className="btn btn-ghost">
              See the events calendar
            </Link>
          </>
        }
        badges={[
          { icon: "people", title: "A ready audience", text: "College students, professionals and chapters across India" },
          { icon: "certificate", title: "Certificates included", text: "Your attendees get GRAAS participation certificates" },
        ]}
      />
      <section className="section bg-mist">
        <div className="shell grid gap-10">
          <SectionHead kicker="What you can host" title="Free or paid. Online or in person." />
          <FeatureGrid
            items={[
              { icon: "mic", title: "Industry lectures", text: "Careers, real projects and lessons from the shop floor." },
              { icon: "learn", title: "Live sessions and webinars", text: "Teach PLC, robotics, ROS, vision, IoT, safety and more." },
              { icon: "build", title: "Workshops", text: "Hands-on classes online or in a lab, with limited seats." },
              { icon: "star", title: "Your profile on GRAAS", text: "Your expert profile appears on every session you host." },
            ]}
          />
        </div>
      </section>
      <section className="section">
        <div className="shell grid gap-10">
          <SectionHead kicker="Fees" title="Two simple ways to run a paid session." intro="For each paid session, GRAAS confirms one of these when it approves it. Free sessions cost nothing to list." />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-7">
              <p className="chip">
                <span className="dot" /> Ticket share
              </p>
              <h3 className="h-card mt-3">GRAAS sells the tickets, you get your share</h3>
              <p className="mt-2 text-ink2">You set a member fee and a public fee. Attendees pay GRAAS online. After the session GRAAS keeps a platform fee (usually 20%) and pays you the rest by bank transfer or UPI, with a statement in your studio.</p>
            </div>
            <div className="card p-7">
              <p className="chip">
                <span className="dot" /> Listing fee
              </p>
              <h3 className="h-card mt-3">You pay to list, attendees join free</h3>
              <p className="mt-2 text-ink2">Good for companies and trainers who want reach. You pay GRAAS a fixed listing fee online; the session is published at once and every attendee joins free.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="section bg-mist">
        <div className="shell grid gap-10">
          <SectionHead kicker="How it works" title="From application to certificates." />
          <StepsRail
            steps={[
              { title: "Apply", text: "Share your experience and topics. GRAAS checks every expert." },
              { title: "Create a session", text: "Title, date, format, seats, fees and the joining link." },
              { title: "GRAAS approves", text: "And confirms the fee model for paid sessions." },
              { title: "Run it", text: "See registrations, mark attendance; attendees get certificates." },
            ]}
          />
        </div>
      </section>
      <section className="section">
        <div className="shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHead kicker="Questions" title="Hosting on GRAAS" action={<Link href="/studio" className="btn btn-primary">Open the Expert studio</Link>} />
          <FaqList
            items={[
              { q: "Do I need to be a GRAAS member?", a: "No. Anyone with real experience can apply. GRAAS approves the expert profile first, then each session." },
              { q: "Who sees attendees' details?", a: "You see attendees' names and member types so you can mark attendance. GRAAS does not share their phone numbers or emails; questions go through the session." },
              { q: "When am I paid under ticket share?", a: "After the session, once attendance is in. GRAAS records the payout with its bank reference, and you see it in your studio." },
              { q: "Can I cancel a session?", a: "Write to GRAAS. If a paid session is cancelled, GRAAS refunds the tickets and informs everyone registered." },
            ]}
          />
        </div>
      </section>
    </>
  );
}
