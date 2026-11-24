import Link from "next/link";
import Icon from "@/components/ui/Icon";
import Photo from "@/components/ui/Photo";
import Reveal from "@/components/ui/Reveal";
import { PHOTOS } from "@/lib/photos";

/** Chapters on the home page: the two offers in one line each, and the way in. */
export default function ChaptersBand({ freeSeats = 15, minMembers = 10 }: { freeSeats?: number; minMembers?: number }) {
  const cards = [
    {
      kind: "college",
      title: "College chapters",
      big: `${freeSeats} free`,
      line: `student memberships for every new chapter`,
      points: [`One chapter per branch, led by a faculty member`, `Starts with at least ${minMembers} students`, `Coordinator console, Excel upload, logins for every student`],
      photo: PHOTOS.rovers,
    },
    {
      kind: "school",
      title: "School chapters",
      big: "Free",
      line: "for every school student up to Class 12",
      points: ["Run by a teacher coordinator", "Students added by the school, approved by GRAAS", "Member ID and certificate for every student"],
      photo: PHOTOS.arduino,
    },
  ];
  return (
    <section className="section">
      <div className="shell">
        <div className="relative overflow-hidden rounded-[28px] bg-ink p-6 text-white sm:p-10 lg:rounded-[40px] lg:p-14">
          <div aria-hidden="true" className="grid-faint pointer-events-none absolute inset-0 opacity-[0.08] invert" />
          <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.6fr] lg:items-center lg:gap-12">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-go">
                <span className="dot" aria-hidden="true" />
                GRAAS chapters
              </p>
              <h2 className="h-section mt-3">Bring GRAAS to your campus, free to start.</h2>
              <p className="lede mt-4 !text-white/70">A chapter is a team of students and a faculty or teacher coordinator who run robotics activity on campus, with GRAAS behind them.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/chapters/apply" className="btn btn-light">
                  Start a chapter
                </Link>
                <Link href="/chapters" className="btn border-white/25 bg-transparent text-white hover:border-white">
                  How chapters work
                </Link>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {cards.map((c, i) => (
                <Reveal key={c.kind} delay={i * 0.1} className="h-full">
                  <Link href={`/chapters#${c.kind}`} className="group flex h-full flex-col overflow-hidden rounded-[22px] bg-white text-ink transition-transform duration-500 hover:-translate-y-1">
                    <span className="relative block h-36 overflow-hidden">
                      <Photo src={c.photo.src} alt={c.photo.alt} sizes="(min-width: 768px) 30vw, 100vw" className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
                      <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold backdrop-blur">{c.title}</span>
                    </span>
                    <span className="flex flex-1 flex-col p-5">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="whitespace-nowrap text-3xl font-semibold tracking-tight text-go-deep">{c.big}</span>
                        <span className="text-sm text-ink2">{c.line}</span>
                      </span>
                      <span className="mt-3 grid gap-1.5 text-[0.95rem]">
                        {c.points.map((p) => (
                          <span key={p} className="flex items-start gap-2">
                            <Icon name="check" size={16} strokeWidth={2.4} className="mt-1 shrink-0 text-go-deep" />
                            {p}
                          </span>
                        ))}
                      </span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
