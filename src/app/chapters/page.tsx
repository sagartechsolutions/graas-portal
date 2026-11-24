import type { Metadata } from "next";
import Link from "next/link";
import JoinBand from "@/components/home/JoinBand";
import SeatCalc from "@/components/chapter/SeatCalc";
import { FaqList, FeatureGrid, PageHero, SectionHead, StepsRail, Ticks } from "@/components/sections/Blocks";
import Icon, { IconTile } from "@/components/ui/Icon";
import Photo from "@/components/ui/Photo";
import Reveal from "@/components/ui/Reveal";
import { CHAPTER_BENEFITS } from "@/lib/benefits";
import { getChapterSettings, getPlans, getPublicChapters } from "@/lib/data";
import { PHOTOS } from "@/lib/photos";

export const metadata: Metadata = {
  title: "College and school chapters",
  description: "Start a GRAAS chapter: branch-wise college chapters with 15 free student memberships, and school chapters where every student is free. Rules, benefits, templates and how to apply.",
};

const rupees = (n: number) => "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n));

export default async function Page() {
  const [s, plans, list] = await Promise.all([getChapterSettings(), getPlans(), getPublicChapters()]);
  const fee = plans.find((p) => p.code === "student-annual")?.price_inr;
  const seatFee = fee != null ? Number(fee) : null;
  const tracks = [
    {
      id: "college",
      title: "College chapter",
      sub: "For a branch of an engineering college, polytechnic or university",
      photo: PHOTOS.rovers,
      price: `${s.free_seats} free`,
      priceNote: `student memberships, then ${seatFee ? rupees(seatFee) : "the Student fee"} per student a year`,
      points: [
        "Branch-wise: one chapter for each branch of a college",
        "Led by a faculty member of that branch (preferred), who gets the chapter login",
        `Starts with at least ${s.min_members} students of the branch`,
        "A letter from the principal asking GRAAS to form the chapter",
        `The first ${s.free_seats} student memberships are free`,
        "More students: the chapter pays in one payment, or each student pays online",
        "A chapter number and a certificate of membership",
      ],
      cta: { href: "/chapters/apply?kind=college", label: "Start a college chapter" },
    },
    {
      id: "school",
      title: "School chapter",
      sub: "For schools, for students up to Class 12",
      photo: PHOTOS.arduino,
      price: "Free",
      priceNote: "for every school student, every year while at school",
      points: [
        "Led by a teacher, who gets the chapter login",
        "A letter from the principal asking GRAAS to form the chapter",
        "Only the school can add its students: no student joins on their own",
        "GRAAS approves every student before their login is sent",
        "A parent's or guardian's name and mobile for every student under 18",
        "Students keep their member number when they reach college",
        "A chapter number and a certificate of membership",
      ],
      cta: { href: "/chapters/apply?kind=school", label: "Register your school" },
    },
  ];
  return (
    <>
      <PageHero
        kicker="Chapter applications are open"
        title="A GRAAS chapter on your campus."
        intro={
          <>
            A chapter is a team of students and a faculty or teacher coordinator who run robotics and automation activity on campus, with GRAAS behind them. College chapters
            start with <strong className="text-ink">{s.free_seats} free student memberships</strong>; in school chapters <strong className="text-ink">every student is free</strong>.
          </>
        }
        photo="chapters"
        actions={
          <>
            <Link href="/chapters/apply" className="btn btn-primary">
              Start a chapter
            </Link>
            <Link href="/chapter" className="btn btn-ghost">
              Coordinator sign-in
            </Link>
          </>
        }
        badges={[
          { icon: "rupee", title: `${s.free_seats} seats free`, text: "In every new college chapter" },
          { icon: "school", title: "Schools: free", text: "For every student to Class 12" },
        ]}
      />

      {/* Two kinds of chapter */}
      <section className="section bg-mist">
        <div className="shell">
          <SectionHead kicker="Two kinds of chapter" title="Choose the chapter that fits your institution." />
          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            {tracks.map((t, i) => (
              <Reveal key={t.id} delay={i * 0.08} className="h-full">
                <article id={t.id} className="card flex h-full scroll-mt-24 flex-col overflow-hidden">
                  <div className="relative h-56 overflow-hidden sm:h-64">
                    <Photo src={t.photo.src} alt={t.photo.alt} sizes="(min-width: 1024px) 45vw, 100vw" className="kenburns h-full w-full" />
                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
                    <div className="absolute inset-x-5 bottom-5 text-white">
                      <h3 className="h-card !text-3xl">{t.title}</h3>
                      <p className="text-white/80">{t.sub}</p>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-5 p-6 sm:p-8">
                    <p className="flex flex-wrap items-baseline gap-x-2 rounded-2xl bg-go-soft px-5 py-4">
                      <span className="text-3xl font-semibold tracking-tight text-go-deep">{t.price}</span>
                      <span className="text-[0.95rem] font-medium text-go-deep">{t.priceNote}</span>
                    </p>
                    <Ticks items={t.points} />
                    <div className="mt-auto flex flex-wrap gap-3 pt-2">
                      <Link href={t.cta.href} className="btn btn-primary">
                        {t.cta.label}
                      </Link>
                      <Link href={`/chapters/letter?kind=${t.id}`} className="btn btn-ghost">
                        Letter template
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="section">
        <div className="shell">
          <SectionHead kicker="Why form a chapter" title="What a college chapter gets." intro="For the department, the coordinator and every student in it." />
          <div className="mt-7">
            <FeatureGrid items={CHAPTER_BENEFITS.college} />
          </div>
          <div className="mt-12">
            <SectionHead title="What a school chapter gets." intro="A safe, supervised first step into robotics, free for every student." />
            <div className="mt-7">
              <FeatureGrid items={CHAPTER_BENEFITS.school} cols="md:grid-cols-2 xl:grid-cols-3" tone="green" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section bg-ink text-white">
        <div className="shell">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-sm font-semibold text-go">
              <span className="dot" aria-hidden="true" />
              How a chapter starts
            </p>
            <h2 className="h-section mt-3">Six steps, all online.</h2>
            <p className="lede mt-4 !text-white/70">The coordinator does everything from one console. Most chapters are ready to send in one sitting.</p>
          </div>
          <div className="mt-9">
            <StepsRail
              dark
              steps={[
                { title: "Create a coordinator account", text: "Your name, designation, college or school, email and a password." },
                { title: "Fill in the chapter", text: "Institution, branch (for colleges), city and the principal's name." },
                { title: "Upload the principal's letter", text: "Use our template; upload a PDF or a photo of the signed letter." },
                { title: "Add the students", text: `One by one or from our Excel sheet. At least ${s.min_members} for a college chapter.` },
                { title: "GRAAS approves", text: "We check the letter and every student, and issue the chapter number." },
                { title: "Logins go out", text: "Every student gets their own login by email, then completes their profile for the certificate." },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Seats */}
      <section className="section">
        <div className="shell">
          <SectionHead kicker="Free seats" title="See what your chapter costs." intro="Move the slider to the number of students. Green seats are free." />
          <div className="mt-7">
            <SeatCalc freeSeats={s.free_seats} minMembers={s.min_members} seatFee={seatFee} />
          </div>
        </div>
      </section>

      {/* Rules */}
      <section className="section bg-mist">
        <div className="shell grid gap-8 lg:grid-cols-[0.8fr_1.5fr] lg:gap-12">
          <div>
            <h2 className="h-section">Chapter rules, in plain words.</h2>
            <p className="lede mt-4">The same rules for every chapter, so every certificate means the same thing.</p>
            <Link href="/policies/membership-rules" className="link mt-6 inline-block">
              Full membership rules
            </Link>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {[
              ["One chapter per branch", "A college can have a chapter in each branch. A school has one chapter."],
              ["A coordinator from the branch", "The chapter is led by a faculty member of the branch where possible, or a teacher for schools."],
              [`At least ${s.min_members} students`, "A college chapter is formed with at least this many students of the branch on its list."],
              ["The principal's letter", "Signed and stamped on the institution's letterhead. Our template has the wording."],
              [`${s.free_seats} free, then the Student fee`, "In a college chapter, more students pay online: the chapter in one payment, or each student."],
              ["GRAAS approves every student", "No login is sent until GRAAS approves. School students can only be added by their school."],
              ["Each student's own login", "Logins go to each student's email. Every email can be used once."],
              ["Certificate after the profile", "A member's certificate is issued once their photo and details are complete."],
              ["A year at a time", `A chapter's membership runs for ${s.valid_months} months and is renewed with GRAAS.`],
              ["Online only", "Fees are paid only on this website. No one collects cash for GRAAS."],
            ].map(([t, d], i) => (
              <li key={t} className="card flex gap-4 p-5">
                <span className="readout flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm text-white">{i + 1}</span>
                <span>
                  <span className="block font-semibold">{t}</span>
                  <span className="mt-1 block text-[0.95rem] text-ink2">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Templates */}
      <section className="section">
        <div className="shell">
          <SectionHead kicker="Templates" title="Everything you need to apply." intro="Download, fill in, and upload in the chapter console." />
          <ul className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { href: "/chapters/letter?kind=college", icon: "letter", title: "Principal's letter: college", text: "Fill in online and print, or download for Word.", file: "/templates/graas-college-chapter-principal-letter.docx" },
              { href: "/chapters/letter?kind=school", icon: "letter", title: "Principal's letter: school", text: "Includes the parents' consent line.", file: "/templates/graas-school-chapter-principal-letter.docx" },
              { href: "/templates/graas-college-chapter-students.xlsx", icon: "grid", title: "Student list: college", text: "Excel sheet with pick-lists for course, year and branch." },
              { href: "/templates/graas-school-chapter-students.xlsx", icon: "grid", title: "Student list: school", text: "Excel sheet with class and parent details." },
            ].map((d) => (
              <li key={d.title} className="card card-lift flex flex-col gap-3 p-5">
                <IconTile name={d.icon} tone="green" />
                <span className="font-semibold">{d.title}</span>
                <span className="text-sm text-ink2">{d.text}</span>
                <span className="mt-auto flex flex-wrap gap-2 pt-1">
                  {d.href.startsWith("/templates/") ? (
                    <a href={d.href} download className="btn btn-ghost !min-h-10 !px-4 text-sm">
                      <Icon name="upload" size={16} className="rotate-180" /> Download Excel
                    </a>
                  ) : (
                    <>
                      <Link href={d.href} className="btn btn-ghost !min-h-10 !px-4 text-sm">
                        Fill in online
                      </Link>
                      {d.file && (
                        <a href={d.file} download className="btn btn-quiet !min-h-10 !px-4 text-sm">
                          Word file
                        </a>
                      )}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Directory */}
      <section className="section bg-mist">
        <div className="shell">
          <SectionHead kicker="GRAAS chapters" title="Chapters across the network." intro="Approved chapters appear here with their chapter number. Anyone can verify a chapter on the Verify page." />
          {list.length === 0 ? (
            <div className="card mt-7 flex flex-wrap items-center justify-between gap-5 p-6 sm:p-8">
              <div className="flex items-center gap-4">
                <IconTile name="sparkle" tone="green" />
                <div>
                  <p className="text-lg font-semibold">The first chapters are being formed now.</p>
                  <p className="text-ink2">Apply today and your institution can be among the first GRAAS chapters.</p>
                </div>
              </div>
              <Link href="/chapters/apply" className="btn btn-primary">
                Start a chapter
              </Link>
            </div>
          ) : (
            <ul className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((c) => (
                <li key={c.code} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <IconTile name={c.kind === "school" ? "school" : "college"} />
                    <span className="readout rounded-md bg-mist px-2 py-1 text-xs">{c.code}</span>
                  </div>
                  <p className="mt-3 font-semibold">{c.name}</p>
                  <p className="text-sm text-ink2">
                    {c.kind === "school" ? "School chapter" : `${c.branch ?? ""} chapter`}
                    {c.city ? `, ${c.city}` : ""}
                  </p>
                  <p className="mt-2 text-sm">
                    <span className="readout font-semibold">{c.members}</span> members
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="section">
        <div className="shell grid gap-7 lg:grid-cols-[0.8fr_1.4fr] lg:gap-10">
          <h2 className="h-section">Questions coordinators ask.</h2>
          <FaqList
            items={[
              { q: "Who can lead a chapter?", a: "For a college chapter, a faculty member of the branch is preferred. For a school chapter, a teacher. The coordinator needs a GRAAS account, not a paid membership." },
              { q: "Our department has more than 15 students. What happens?", a: `The first ${s.free_seats} students are free. For the rest, the coordinator either pays in one online payment from the chapter console, or lets each student pay from their own account. Either way, each student is a full Student member.` },
              { q: "Do students need to sign up themselves?", a: "No. The coordinator adds them, from a form or our Excel sheet. Once GRAAS approves, each student gets an email with their login ID and a first password, which they change when they sign in." },
              { q: "Can a school student join without the school?", a: "No. School students join only through their school's chapter, so every student is known to a teacher and approved by GRAAS." },
              { q: "When do students get their certificate?", a: "As soon as they complete their profile: a photo and every detail their membership needs. The coordinator can see who has finished." },
              { q: "What does the chapter itself get?", a: "A chapter number (for example GRAAS-CHAP-26-0001), a certificate of membership naming the institution, branch and coordinator, and a place on this page." },
              { q: "What if a student did not get the email?", a: "The coordinator can send the login again from the console until the student signs in for the first time. After that, the student uses Forgot password." },
            ]}
          />
        </div>
      </section>

      <JoinBand title="Bring GRAAS to your campus." text="Create a coordinator account, upload the principal's letter and add your students. GRAAS does the rest." />
    </>
  );
}
