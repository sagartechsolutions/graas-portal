import type { Metadata } from "next";
import Link from "next/link";
import JoinBand from "@/components/home/JoinBand";
import { FaqList, FeatureGrid, PageHero, SectionHead, StepsRail, Ticks } from "@/components/sections/Blocks";
import { IconTile } from "@/components/ui/Icon";
import Photo from "@/components/ui/Photo";
import Reveal from "@/components/ui/Reveal";
import { getPlans, getTerms } from "@/lib/data";
import { PHOTOS } from "@/lib/photos";
import { TRACKS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Industries",
  description: "How manufacturers, automation companies and integrators work with GRAAS: hiring, automation challenges for student teams, guest lectures, sponsorship and skill programmes.",
};

const rupees = (n: number) => "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n));

const SECTORS = [
  { icon: "factory", t: "Automotive and auto components", d: "Body shops, assembly lines, machining cells and quality inspection." },
  { icon: "build", t: "Machine builders and SPMs", d: "Special-purpose machines, fixtures, pneumatics and PLC programming." },
  { icon: "robot", t: "Robot and automation integrators", d: "Cells, conveyors, vision, palletising and commissioning." },
  { icon: "chart", t: "Process industries", d: "Pharma, food, chemicals and packaging: SCADA, instrumentation, batch control." },
  { icon: "grid", t: "Electronics manufacturing", d: "SMT lines, testing, traceability and smart-factory systems." },
  { icon: "sparkle", t: "Technology and software firms", d: "IoT, AI for automation, digital twins and industrial software." },
];

export default async function Page() {
  const [plans, terms] = await Promise.all([getPlans(), getTerms()]);
  const ind = plans.find((p) => p.code === "industry-annual");
  const price = ind?.price_inr != null ? Number(ind.price_inr) : null;
  const longest = terms.reduce((a, t) => (t.years > (a?.years ?? 0) ? t : a), terms[0]);
  return (
    <>
      <PageHero
        kicker="For companies"
        title="Where factories meet the people who will automate them."
        intro="Companies bring problems, jobs and shop floors. Students and professionals bring skills and prototypes. GRAAS keeps both sides verified, so the right people meet."
        photo="industry"
        actions={
          <>
            <Link href="/join?plan=industry-annual" className="btn btn-primary">
              Apply as a company
            </Link>
            <Link href="/contact" className="btn btn-ghost">
              Talk to us first
            </Link>
          </>
        }
        badges={[
          { icon: "briefcase", title: "Hire people who have built", text: "Verified certificates and projects" },
          { icon: "build", title: "Post real problems", text: "Student teams propose and prototype" },
        ]}
      />

      <section className="section bg-mist">
        <div className="shell">
          <SectionHead kicker="What you get" title="Five ways GRAAS works for industry." intro="One Industry membership opens all of them. Each one is agreed with you before anything is shared." />
          <div className="mt-7">
            <FeatureGrid
              cols="md:grid-cols-2 xl:grid-cols-3"
              items={[
                { icon: "briefcase", title: "Hiring and internships", text: "Post jobs, internships and apprenticeships to members. See verified certificates and projects, and reach students who chose to be found." },
                { icon: "build", title: "Automation challenges", text: "Publish a real problem from your line. Student teams propose, you shortlist, and the best build prototypes. Confidentiality is agreed first." },
                { icon: "mic", title: "Guest lectures and visits", text: "Your engineers speak at GRAAS sessions and chapters; students visit your plant. Your company becomes known where talent is formed." },
                { icon: "star", title: "Events and sponsorship", text: "Sponsor competitions, awards and GRAASCON, the GRAAS conference, and show your technology to students, faculty and peers." },
                { icon: "handshake", title: "Skill programmes", text: "Run training in your technology with GRAAS, in ways that can fit your CSR and skill-development plans, with certificates that name you as partner." },
                { icon: "shield", title: "A verified profile", text: "A verified company profile and an industry membership certificate. Members and colleges can check you are who you say you are." },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <Reveal>
            <div className="relative overflow-hidden rounded-[28px]">
              <Photo src={PHOTOS.assembly.src} alt={PHOTOS.assembly.alt} sizes="(min-width: 1024px) 45vw, 100vw" className="kenburns aspect-[16/10] w-full" />
            </div>
          </Reveal>
          <div>
            <SectionHead kicker="Automation challenges" title="Your problem, a dozen fresh minds." />
            <p className="lede mt-4">An automation challenge is a real problem from your plant, scoped so a student team can work on it safely. GRAAS runs it end to end.</p>
            <div className="mt-6">
              <StepsRail
                steps={[
                  { title: "You describe the problem", text: "A cycle-time loss, a manual check, a fixture that keeps failing." },
                  { title: "GRAAS scopes it", text: "Confidentiality and IP terms agreed before details go out." },
                  { title: "Teams propose", text: "You shortlist the proposals that make sense." },
                  { title: "Prototype and demo", text: "Case study published only if you agree." },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-mist">
        <div className="shell">
          <SectionHead kicker="Who we work with" title="Built for every corner of Indian manufacturing." />
          <ul className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {SECTORS.map((s, i) => (
              <li key={s.t}>
                <Reveal delay={(i % 3) * 0.06} className="h-full">
                  <div className="card flex h-full gap-4 p-5">
                    <IconTile name={s.icon} />
                    <span>
                      <span className="block font-semibold">{s.t}</span>
                      <span className="mt-1 block text-[0.95rem] text-ink2">{s.d}</span>
                    </span>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-[24px] border border-line bg-white p-6">
            <p className="font-semibold">Skills GRAAS members learn</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {TRACKS.map((t) => (
                <li key={t} className="chip">
                  <span className="dot" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-12">
          <div>
            <SectionHead kicker="Industry membership" title="One membership, a year at a time or longer." />
            <div className="mt-6">
              <Ticks
                items={[
                  "Verified company profile and industry membership certificate",
                  "Post jobs, internships and automation challenges as each programme opens",
                  "Guest lectures, industrial visits and chapter partnerships",
                  "Sponsorship options for events, competitions and GRAASCON",
                  "Named HR and technical contacts in your account",
                ]}
              />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[28px] bg-ink p-7 text-white sm:p-9">
            <div aria-hidden="true" className="grid-faint pointer-events-none absolute inset-0 opacity-[0.08] invert" />
            <div className="relative">
              <p className="text-sm text-white/60">Industry membership</p>
              <p className="readout mt-2 text-5xl font-medium">{price !== null ? rupees(price) : "Fee to be announced"}</p>
              {price !== null && <p className="mt-1 text-white/70">per year{ind?.gst_percent ? ` + ${ind.gst_percent}% GST` : ""}. Pay once for longer and save up to {longest ? `${longest.discount_percent}%` : "40%"}.</p>}
              <p className="mt-5 text-white/75">GRAAS verifies the company first, usually within a few working days. Payment is online only, through Razorpay.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/join?plan=industry-annual" className="btn btn-light">
                  Apply as a company
                </Link>
                <Link href="/membership#industry" className="btn border-white/25 bg-transparent text-white hover:border-white">
                  Every benefit
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell grid gap-7 lg:grid-cols-[0.8fr_1.4fr] lg:gap-10">
          <h2 className="h-section">Questions companies ask.</h2>
          <FaqList
            items={[
              { q: "Who in the company should apply?", a: "Anyone authorised to represent it: HR, a plant head or an engineering manager. GRAAS verifies the company before payment." },
              { q: "Is our information kept confidential?", a: "Yes. For challenges, confidentiality and intellectual-property terms are agreed before any detail is shown to a team. Nothing is published without your agreement." },
              { q: "Can we reach students in a particular region or branch?", a: "GRAAS chapters are organised by college and branch, so lectures, visits and challenges can be aimed at the right departments." },
              { q: "Can we sponsor an event without a membership?", a: "Write to us. Membership makes it simpler, but we will find the right way to work together." },
            ]}
          />
        </div>
      </section>

      <JoinBand title="Meet the engineers you will hire next." text="Apply as an industry member, or write to us to plan a lecture, a visit or a challenge." />
    </>
  );
}
