import type { Metadata } from "next";
import Link from "next/link";
import { CertificateArt, VerifyScan } from "@/components/home/Illustrations";
import HowItWorks from "@/components/home/HowItWorks";
import JoinBand from "@/components/home/JoinBand";
import MemberCard from "@/components/home/MemberCard";
import Plans from "@/components/home/Plans";
import RulesGlance from "@/components/home/RulesGlance";
import CardFan from "@/components/membership/CardFan";
import Calculator from "@/components/membership/Calculator";
import Compare from "@/components/membership/Compare";
import TypeExplorer from "@/components/membership/TypeExplorer";
import { rupees } from "@/components/membership/price";
import { FaqList, SectionHead } from "@/components/sections/Blocks";
import Icon from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";
import { MEMBER_TYPES } from "@/lib/benefits";
import { getChapterSettings, getPlans, getTerms } from "@/lib/data";

export const metadata: Metadata = {
  title: "Membership and plans",
  description: "Every GRAAS membership in detail: school students (free), students, professionals, institutions, industry and college chapters. Benefits, fees, savings and how to join.",
};

const SERIES = [
  { code: "SCH", who: "School student", eg: "GRAAS-SCH-26-00001" },
  { code: "STU", who: "College student", eg: "GRAAS-STU-26-00001" },
  { code: "PRO", who: "Professional", eg: "GRAAS-PRO-26-00001" },
  { code: "INS", who: "Institution", eg: "GRAAS-INS-26-00001" },
  { code: "IND", who: "Industry", eg: "GRAAS-IND-26-00001" },
  { code: "CHAP", who: "College chapter", eg: "GRAAS-CHAP-26-0001" },
  { code: "SCHL", who: "School chapter", eg: "GRAAS-SCHL-26-0001" },
];

export default async function Page() {
  const [plans, terms, chapters] = await Promise.all([getPlans(), getTerms(), getChapterSettings()]);
  const student = plans.find((p) => p.code === "student-annual");
  const seatFee = student?.price_inr != null ? Number(student.price_inr) : null;
  const priceOf = (code: string) => {
    const p = plans.find((x) => x.code === code);
    if (code === "school-student") return "Free";
    return p?.price_inr != null ? `${rupees(Number(p.price_inr))}/yr` : "—";
  };
  const maxDiscount = Math.max(0, ...terms.map((t) => Number(t.discount_percent)));
  return (
    <>
      {/* Opening */}
      <section className="relative overflow-hidden">
        <div className="shell grid items-center gap-8 pb-10 pt-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-14 lg:pt-10">
          <div>
            <p className="chip">
              <span className="dot dot-live" />
              Membership is open. Join online in minutes
            </p>
            <h1 className="h-display mt-5 !text-[clamp(2.4rem,1.4rem+3.6vw,4.6rem)]">Membership that grows with you, from school to industry.</h1>
            <p className="lede mt-5">
              Five ways to belong, one verified network. Choose who you are to see every benefit, what it costs, and exactly how to join. School students are
              free through their school; college chapters start with {chapters.free_seats} free seats.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/join" className="btn btn-primary">
                Become a member
              </Link>
              <a href="#types" className="btn btn-ghost">
                Find your membership
              </a>
            </div>
            <ul className="mt-8 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["From ₹0", "School students"],
                [student?.price_inr != null ? rupees(Number(student.price_inr)) : "—", "Student, a year"],
                [`${maxDiscount || 40}%`, "Off when you pay once"],
                ["QR", "Verified ID"],
              ].map(([big, small]) => (
                <li key={small} className="rounded-2xl border border-line bg-white p-3.5">
                  <span className="readout block text-xl font-medium tracking-tight">{big}</span>
                  <span className="block text-sm text-ink2">{small}</span>
                </li>
              ))}
            </ul>
          </div>
          <CardFan />
        </div>
      </section>

      {/* Every kind of membership, in detail */}
      <section className="section bg-mist">
        <div className="shell">
          <SectionHead kicker="Choose who you are" title="Every benefit, for every kind of member." intro="Pick a membership to see who it is for, what it costs, everything it includes, what to have ready and how to join." />
          <div className="mt-7">
            <TypeExplorer types={MEMBER_TYPES} plans={plans} terms={terms} freeSeats={chapters.free_seats} seatFee={seatFee} />
          </div>
          <p className="mt-5 flex items-start gap-2 text-sm text-ink2">
            <Icon name="clock" size={18} className="mt-0.5 shrink-0" />
            GRAAS programmes open in stages. Members are first in line for every lecture, course, event and industry programme as it opens, and the membership period
            counts from the day the membership becomes active.
          </p>
        </div>
      </section>

      {/* What every member holds */}
      <section className="section">
        <div className="shell">
          <SectionHead kicker="Yours from day one" title="A member ID anyone can verify, and a certificate worth keeping." intro="Both live in your account, always show your current membership, and print at the right size." />
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <Reveal className="h-full">
              <div className="card flex h-full flex-col overflow-hidden">
                <div className="grid-faint flex h-64 items-center justify-center bg-mist p-6">
                  <div className="float-y w-full max-w-[300px]">
                    <MemberCard />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="h-card">Digital member ID</h3>
                  <p className="mt-2 text-ink2">Your photo, name, membership and member number, with a QR code on the back. Prints at bank-card size.</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.08} className="h-full">
              <div className="card flex h-full flex-col overflow-hidden">
                <div className="relative h-64 overflow-hidden bg-mist">
                  <CertificateArt />
                </div>
                <div className="p-6">
                  <h3 className="h-card">Membership certificate</h3>
                  <p className="mt-2 text-ink2">One A4 landscape page with the GRAAS seal and a QR code. Ready as soon as your profile and photo are complete.</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.16} className="h-full">
              <div className="card flex h-full flex-col overflow-hidden">
                <div className="relative h-64 overflow-hidden bg-mist">
                  <VerifyScan />
                </div>
                <div className="p-6">
                  <h3 className="h-card">Checked in seconds</h3>
                  <p className="mt-2 text-ink2">A college, an event desk or an employer scans the QR or types the number on the Verify page.</p>
                  <Link href="/verify" className="link mt-3 inline-block text-[0.95rem]">
                    Verify a member
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
          <div className="mt-8 rounded-[24px] border border-line p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h3 className="h-card">Member numbers you can read</h3>
                <p className="mt-1.5 text-ink2">Each kind of member has its own series, so a number tells you at a glance who it belongs to.</p>
              </div>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
              {SERIES.map((s) => (
                <li key={s.code} className="rounded-2xl bg-mist p-4">
                  <span className="inline-flex rounded-md bg-ink px-2 py-0.5 text-sm font-semibold text-white">{s.code}</span>
                  <span className="mt-2 block font-semibold">{s.who}</span>
                  <span className="readout mt-0.5 block text-sm text-ink2">{s.eg}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Side by side */}
      <section id="compare" className="section scroll-mt-20 bg-mist">
        <div className="shell">
          <SectionHead kicker="Side by side" title="Compare all memberships." />
          <div className="mt-7">
            <Compare prices={["school-student", "student-annual", "professional-annual", "institution-annual", "industry-annual"].map(priceOf)} />
          </div>
        </div>
      </section>

      {/* Fees */}
      <Plans />

      <section className="section pt-0">
        <div className="shell">
          <SectionHead kicker="Pay once and save" title="See your price before you join." intro="Choose a membership and a length. The same price is shown again on the payment screen." />
          <div className="mt-7">
            <Calculator plans={plans} terms={terms} />
          </div>
        </div>
      </section>

      <HowItWorks />

      {/* Chapters */}
      <section className="section">
        <div className="shell grid gap-5 md:grid-cols-2">
          {[
            { href: "/chapters#college", title: "College chapters", big: `${chapters.free_seats} free seats`, text: `One chapter per branch, led by a faculty member, starting with at least ${chapters.min_members} students. Extra students join at the Student fee.`, icon: "college" },
            { href: "/chapters#school", title: "School chapters", big: "Free for every student", text: "A teacher registers the school, adds the students and GRAAS approves them. Every student gets a login, ID and certificate.", icon: "school" },
          ].map((c, i) => (
            <Reveal key={c.href} delay={i * 0.08} className="h-full">
              <Link href={c.href} className="card card-lift sheen group flex h-full flex-col gap-3 p-6 sm:p-8">
                <span className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-go-deep">{c.title}</span>
                  <Icon name={c.icon} size={26} />
                </span>
                <span className="text-3xl font-semibold tracking-tight">{c.big}</span>
                <span className="text-ink2">{c.text}</span>
                <span className="mt-auto flex items-center gap-2 pt-2 font-semibold">
                  How it works <Icon name="arrow" size={18} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <RulesGlance />

      <section className="section pt-0">
        <div className="shell grid gap-7 lg:grid-cols-[0.8fr_1.4fr] lg:gap-10">
          <h2 className="h-section">Questions about membership.</h2>
          <FaqList
            items={[
              { q: "Can I pay for more than one year?", a: `Yes. Student, Professional, Institution and Industry memberships can be paid for 1, 3 or 5 years, or as a lifetime (10-year) membership, each at a discount of up to ${maxDiscount || 40}%. You choose the length on the payment screen.` },
              { q: "When does my membership start?", a: "The moment your payment is confirmed. Institution and industry applications are verified by GRAAS first. Chapter students are active as soon as GRAAS approves them and their login is sent." },
              { q: "Why is my certificate not showing yet?", a: "The certificate is issued once your profile is complete: your photo and every detail your membership needs. Your account shows what is missing." },
              { q: "I am in school. How do I join?", a: "Ask a teacher to register your school as a GRAAS school chapter. Your teacher adds you, GRAAS approves you, and your login arrives by email, free. School students cannot join on their own." },
              { q: "Can I change my membership type later?", a: "Yes. Before you pay, change it yourself in your account. After you pay, ask from your account; GRAAS approves the change and tells you any difference in fee. Your member number stays the same." },
              { q: "What happens when it ends?", a: "Renewal opens 60 days before the end date, and renewing early adds a full period, so you lose no days. You keep your member number." },
            ]}
          />
        </div>
      </section>

      <JoinBand title="Find your membership and join today." text="Students and professionals are active as soon as they pay. Schools and colleges can start a chapter for free." />
    </>
  );
}
