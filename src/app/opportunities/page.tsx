import type { Metadata } from "next";
import Link from "next/link";
import JoinBand from "@/components/home/JoinBand";
import OppBrowser from "@/components/opps/OppBrowser";
import { FaqList, FeatureGrid, PageHero, SectionHead, StepsRail } from "@/components/sections/Blocks";
import { getOpportunities } from "@/lib/data";

export const metadata: Metadata = {
  title: "Opportunities",
  description: "Jobs, internships, projects, problem statements and challenges in robotics and automation, from GRAAS member companies and institutions. Apply with your GRAAS profile.",
};

export default async function Page() {
  const items = await getOpportunities();
  const kinds = new Set(items.map((o) => o.kind));
  return (
    <>
      <PageHero
        kicker="Jobs · internships · projects · challenges"
        title={<>Opportunities from the people who build automation.</>}
        intro={<>GRAAS member companies and institutions post jobs, internships, live projects, shop-floor problem statements and challenges. GRAAS checks every post. Members apply with one profile, and contact details stay private until both sides say yes.</>}
        photo="engineer"
        actions={
          <>
            <a href="#browse" className="btn btn-primary">
              Browse {items.length ? `${items.length} open ${items.length === 1 ? "opportunity" : "opportunities"}` : "opportunities"}
            </a>
            <Link href="/industries" className="btn btn-ghost">
              Post as a company
            </Link>
          </>
        }
        badges={[
          { icon: "shield", title: "Every post checked", text: "GRAAS approves each one before members see it" },
          { icon: "sparkle", title: "Top 5 matches", text: "Companies see the best-fitting profiles, never your number" },
        ]}
      />

      <section id="browse" className="section scroll-mt-24 bg-mist">
        <div className="shell grid gap-8">
          <SectionHead kicker="Open now" title="Find your next step." intro={kinds.size ? "Filter by type, place and who it is open to. Open any post to read the full details." : "New posts appear here as soon as GRAAS approves them."} />
          <OppBrowser items={items} />
        </div>
      </section>

      <section className="section">
        <div className="shell grid gap-10">
          <SectionHead kicker="For members" title="Apply once, with a profile that shows your work." intro="Your GRAAS career profile is your application: skills, projects, experience and certificates, plus a one-page resume you can download." />
          <StepsRail
            steps={[
              { title: "Build your profile", text: "Headline, skills, projects, education. GRAAS certificates are added for you." },
              { title: "Apply or get invited", text: "Apply in one click, or a company invites you from its top 5 matches." },
              { title: "Connect when both agree", text: "Mobile and email are shared only after you and the company accept." },
              { title: "Track every step", text: "Shortlisted, interview, selected: you see it in your account and by email." },
            ]}
          />
        </div>
      </section>

      <section className="section bg-mist">
        <div className="shell grid gap-10">
          <SectionHead kicker="For companies and institutions" title="Post a role or a real problem. Meet people who have built things." intro="Posting is part of the Industry and Institution membership." action={<Link href="/membership" className="btn btn-primary">See Industry membership</Link>} />
          <FeatureGrid
            items={[
              { icon: "briefcase", title: "Jobs and internships", text: "Fresh engineers, diploma holders and working professionals in automation." },
              { icon: "build", title: "Problem statements", text: "Give student teams a real shop-floor problem. Get prototypes and ideas back." },
              { icon: "trophy", title: "Challenges", text: "Run a competition or hackathon with prizes, open to college or school students." },
              { icon: "people", title: "Top 5 matches", text: "For each post, GRAAS suggests the five best-fitting member profiles to invite." },
            ]}
          />
        </div>
      </section>

      <section className="section">
        <div className="shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHead kicker="Questions" title="How opportunities work" />
          <FaqList
            items={[
              { q: "Who can apply?", a: "Active GRAAS members. College students and professionals see every post open to them. School students see challenges, trainings and projects meant for schools; their contact details are never shared, and GRAAS puts the school in touch." },
              { q: "Who sees my phone number and email?", a: "Nobody, until both sides accept. When you apply you agree that the company may see them if it accepts you; when a company invites you, they are shared only if you accept." },
              { q: "What does a company see before that?", a: "Your career profile: name, photo, headline, skills, education, projects, experience and achievements. Never your date of birth, guardian details or contact details." },
              { q: "Who can post?", a: "Organisations with an active Industry or Institution membership, and GRAAS itself. Every post is checked by GRAAS before it goes live." },
              { q: "Does GRAAS charge students for applying?", a: "No. Applying is part of your membership. GRAAS never asks for money to apply, and asks companies not to either; report any such request to connect@graas.org.in." },
            ]}
          />
        </div>
      </section>
      <JoinBand title="Your profile is your application." text="Join GRAAS, build your career profile and apply to automation roles and challenges in one click." />
    </>
  );
}
