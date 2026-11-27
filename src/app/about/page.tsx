import type { Metadata } from "next";
import Link from "next/link";
import LiveNumbers from "@/components/about/LiveNumbers";
import Climb from "@/components/home/Climb";
import JoinBand from "@/components/home/JoinBand";
import { FeatureGrid, LinkCard, PageHero, SectionHead } from "@/components/sections/Blocks";
import Photo from "@/components/ui/Photo";
import Reveal from "@/components/ui/Reveal";
import { getOrg } from "@/lib/data";
import { PHOTOS } from "@/lib/photos";
import { ORG } from "@/lib/site";

export const metadata: Metadata = { title: "About GRAAS", description: `About the ${ORG.name}: why it exists, what it does, who it is for and how it works.` };

export default async function Page() {
  const org = await getOrg();
  return (
    <>
      <PageHero
        kicker="About the society"
        title="Robotics and automation, open to everyone who wants to build."
        intro={`The ${ORG.name} (GRAAS) connects school and college students, teachers, professionals, institutions and industry, so that skills, projects and opportunities move between them.`}
        photo="lab"
        actions={
          <>
            <Link href="/membership" className="btn btn-primary">
              Membership
            </Link>
            <Link href="/contact" className="btn btn-ghost">
              Contact us
            </Link>
          </>
        }
        badges={[
          { icon: "people", title: "One network", text: "School to industry" },
          { icon: "shield", title: "Verified members", text: "QR-checked IDs and certificates" },
        ]}
      />

      <LiveNumbers />

      <section className="section bg-mist">
        <div className="shell grid gap-8 lg:grid-cols-2 lg:gap-12">
          <Reveal>
            <div className="card h-full p-7 sm:p-9">
              <p className="text-sm font-semibold text-go-deep">Our mission</p>
              <h2 className="h-section mt-3 !text-[clamp(1.7rem,1.2rem+1.6vw,2.6rem)]">Leading the global robotics revolution.</h2>
              <p className="mt-4 text-ink2">
                To promote innovation, learning, and collaboration in robotics and automation to develop technologies that support sustainable development, enhance
                human welfare, and ensure safety and peace for society. To develop and promote innovative robotics and automation solutions that benefit academia,
                industry, society and human welfare.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="card h-full bg-ink p-7 text-white sm:p-9">
              <p className="text-sm font-semibold text-go">Our vision</p>
              <h2 className="h-section mt-3 !text-[clamp(1.7rem,1.2rem+1.6vw,2.6rem)]">A connected global community.</h2>
              <p className="mt-4 text-white/75">
                To nurture young minds across the globe for sustainable development, industrial growth, technology advancement, peace and the safety of all humanity.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <SectionHead kicker="What we do" title="Six things GRAAS does, every year." />
          <div className="mt-7">
            <FeatureGrid
              cols="md:grid-cols-2 xl:grid-cols-3"
              items={[
                { icon: "learn", title: "Teach", text: "Live lectures, courses with projects and assessments, and sessions for school students, led by engineers and faculty." },
                { icon: "people", title: "Organise chapters", text: "College chapters branch by branch, and school chapters, each with a coordinator and its own console." },
                { icon: "trophy", title: "Run competitions", text: "Robot challenges, hackathons and inter-college and inter-school competitions." },
                { icon: "factory", title: "Bring industry in", text: "Companies post problems, jobs and internships, give guest lectures and host visits." },
                { icon: "calendar", title: "Hold GRAASCON", text: "A yearly conference where students, faculty and industry share what they have built." },
                { icon: "certificate", title: "Verify everything", text: "Every member ID, chapter and certificate carries a QR code that anyone can check." },
              ]}
            />
          </div>
        </div>
      </section>

      <Climb />

      <section className="section bg-mist">
        <div className="shell grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          <Reveal>
            <div className="overflow-hidden rounded-[28px]">
              <Photo src={PHOTOS.chapters.src} alt={PHOTOS.chapters.alt} sizes="(min-width: 1024px) 45vw, 100vw" className="aspect-[4/3] w-full" />
            </div>
          </Reveal>
          <div>
            <SectionHead kicker="How we work" title="Principles we keep." />
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ["Doing over watching", "Every programme ends in something built, tested or shown."],
                ["Verified, not claimed", "Members, chapters and certificates can be checked by anyone."],
                ["Open to every level", "From Class 1 to PhD, and from a first job to a plant head."],
                ["Fair and transparent", "Fees and rules are published. Money is only paid online, never in cash."],
                ["Safe for young members", "School students join only through their school, with a parent's or guardian's details."],
                ["Measured by results", "Lectures attended, projects finished, people placed. Sign-up counts are not the score."],
              ].map(([t, d]) => (
                <div key={t} className="card p-5">
                  <dt className="font-semibold">{t}</dt>
                  <dd className="mt-1 text-[0.95rem] text-ink2">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <SectionHead kicker="Find your way in" title="Where to go next." />
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <LinkCard href="/membership" icon="id" title="Membership" text="Every benefit for every kind of member." />
            <LinkCard href="/chapters" icon="people" title="Chapters" text="Bring GRAAS to your college or school." />
            <LinkCard href="/industries" icon="factory" title="Industries" text="Hire, post challenges, sponsor." />
            <LinkCard href="/policies" icon="shield" title="Rules and policies" text="Membership rules, conduct, refunds, privacy." />
          </div>
          <div className="mt-8 rounded-[24px] border border-line p-6">
            <p className="font-semibold">{org.name}</p>
            <p className="mt-1 text-ink2">
              {[org.address, org.email, org.phone].filter(Boolean).join(" · ") || "connect@graas.org.in"}
            </p>
          </div>
        </div>
      </section>

      <JoinBand />
    </>
  );
}
