import type { Metadata } from "next";
import Link from "next/link";
import JoinBand from "@/components/home/JoinBand";
import EventBrowser from "@/components/events/EventBrowser";
import { FaqList, FeatureGrid, PageHero, SectionHead, StepsRail } from "@/components/sections/Blocks";
import { getEvents } from "@/lib/data";

export const metadata: Metadata = {
  title: "Events and live sessions",
  description: "Webinars, live sessions, industry-leader lectures, workshops, competitions and industrial visits from GRAAS, its chapters and approved experts. Free or discounted for members.",
};

export default async function Page() {
  const items = await getEvents();
  return (
    <>
      <PageHero
        kicker="Webinars · lectures · workshops · competitions"
        title={<>Learn live from the people who run automation.</>}
        intro={<>Webinars and live sessions, lectures by industry leaders, hands-on workshops, chapter competitions and industrial visits. Many are free for GRAAS members; the rest come at a member discount. Every attendee gets a participation certificate.</>}
        photo="learn"
        actions={
          <>
            <a href="#calendar" className="btn btn-primary">
              See the calendar
            </a>
            <Link href="/experts" className="btn btn-ghost">
              Host a session
            </Link>
          </>
        }
        badges={[
          { icon: "rupee", title: "Free or discounted", text: "Members pay nothing or a member price" },
          { icon: "certificate", title: "Certificate for attendees", text: "Issued in your account after the event" },
        ]}
      />
      <section id="calendar" className="section scroll-mt-24 bg-mist">
        <div className="shell grid gap-8">
          <SectionHead kicker="Calendar" title="What is coming up." intro="Open an event to see the details, the speaker and the fee for you. Register from your account; online events show the joining link there." />
          <EventBrowser items={items} />
        </div>
      </section>
      <section className="section">
        <div className="shell grid gap-10">
          <SectionHead kicker="What runs on GRAAS" title="Four ways to learn and compete." />
          <FeatureGrid
            items={[
              { icon: "mic", title: "Industry-leader lectures", text: "Plant heads, automation leads and founders on real projects and careers." },
              { icon: "learn", title: "Live sessions and webinars", text: "Hands-on classes on PLC, ROS, vision, IoT and more, with questions answered live." },
              { icon: "trophy", title: "Chapter competitions", text: "College and school chapters announce competitions; GRAAS approves and lists them." },
              { icon: "factory", title: "Workshops and visits", text: "Build in a lab, or walk a real shop floor with the engineers who run it." },
            ]}
          />
        </div>
      </section>
      <section className="section bg-mist">
        <div className="shell grid gap-10">
          <SectionHead kicker="How it works" title="Register in a minute." />
          <StepsRail
            steps={[
              { title: "Pick an event", text: "See the fee for you: free or member price for members." },
              { title: "Register or pay", text: "Free events register at once; paid ones take UPI, cards or net banking." },
              { title: "Join", text: "The joining link or venue is in your account and your email." },
              { title: "Get your certificate", text: "Once attendance is marked, your participation certificate is ready to print." },
            ]}
          />
        </div>
      </section>
      <section className="section">
        <div className="shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHead kicker="Questions" title="Events and sessions" action={<Link href="/experts" className="btn btn-ghost">Become a GRAAS expert</Link>} />
          <FaqList
            items={[
              { q: "Are sessions free for members?", a: "Many are. Each event shows a member fee (often zero) and a fee for others. Members always pay the same or less." },
              { q: "Can non-members join?", a: "Yes, when the event is open to the public. Create a free GRAAS login, then register at the public fee." },
              { q: "Who runs the sessions?", a: "GRAAS, its college and school chapters, and approved experts from industry. GRAAS checks every event before it is listed." },
              { q: "How do refunds work for paid tickets?", a: "If GRAAS cancels an event, paid tickets are refunded to the same account. For anything else, see the refund policy or write to connect@graas.org.in." },
              { q: "I want to teach. How do I start?", a: "Apply in the Expert studio. Once GRAAS approves your profile, you can create sessions; GRAAS confirms the fee model for paid ones." },
            ]}
          />
        </div>
      </section>
      <JoinBand title="Members learn for less." text="Join GRAAS for free or discounted live sessions, industry-leader lectures, competitions and a certificate for every event you attend." />
    </>
  );
}
