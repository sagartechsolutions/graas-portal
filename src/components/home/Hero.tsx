import Link from "next/link";
import { LogoMark } from "@/components/site/Logo";
import HeroSlides from "./HeroSlides";
import MemberCard from "./MemberCard";

const OPEN_TO = [
  { label: "Schools", note: "Class 1 to 12, free", h: 7, c: "#d4d6da" },
  { label: "Students", note: "Diploma to PhD", h: 11, c: "#b7babf" },
  { label: "Professionals", note: "Engineers and faculty", h: 15, c: "#8e919a" },
  { label: "Institutions", note: "Colleges and universities", h: 20, c: "#5a616b" },
  { label: "Industry", note: "Manufacturers", h: 25, c: "#000e21" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* The logo at architectural scale: four bars rising behind the headline. */}
      <svg aria-hidden="true" viewBox="80 38 382 340" className="pointer-events-none absolute -left-[6%] bottom-0 hidden h-[82%] opacity-[0.032] lg:block">
        <g className="bars-rise">
          <path d="M114 380V279L139.5 246L165 279V380Z" fill="#000e21" />
          <path d="M200 380V220L225 186L250 220V380Z" fill="#000e21" />
          <path d="M284 380V167L309.5 132L335 167V380Z" fill="#000e21" />
          <path d="M372 380V123L397.5 89L423 123V380Z" fill="#000e21" />
        </g>
      </svg>

      <div className="shell relative grid items-center gap-10 pb-14 pt-8 lg:grid-cols-[1.08fr_1fr] lg:gap-8 2xl:gap-10 lg:pb-32 lg:pt-10">
        <div>
          <p className="chip">
            <span className="dot dot-live" />
            <span>
              Global Robotics And Automation Society<span className="hidden sm:inline">, India</span>
            </span>
          </p>
          <h1 className="h-display mt-6">One society for everyone who builds robots and automates.</h1>
          <p className="lede mt-6">
            GRAAS brings school students, college students, professionals, institutions and industry into one network, to learn robotics and
            automation from people who do it, build real machines together, compete, and meet the companies that hire.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/membership" className="btn btn-primary">
              See membership benefits
            </Link>
            <Link href="/chapters" className="btn btn-ghost">
              Start a chapter
            </Link>
          </div>
          <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-x-5 gap-y-5 border-t border-line pt-6 sm:grid-cols-5">
            {OPEN_TO.map((o) => (
              <div key={o.label}>
                <span aria-hidden="true" className="mb-2.5 flex h-[25px] items-end">
                  <span className="block w-2.5 rounded-t-[2px]" style={{ height: o.h, background: o.c }} />
                </span>
                <dt className="text-[0.95rem] font-semibold">{o.label}</dt>
                <dd className="text-sm text-ink2">{o.note}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-[560px] lg:mr-0 lg:max-w-none">
          <div className="aspect-[4/4.4] sm:aspect-[4/3.6] lg:aspect-[4/4.3] 2xl:aspect-[4/3.7]">
            <HeroSlides />
          </div>
          <div className="absolute right-4 top-4 flex items-center gap-3 rounded-2xl border border-white/60 bg-white/85 py-2.5 pl-3 pr-4 shadow-[var(--shadow-card)] backdrop-blur-md">
            <LogoMark size={34} animate />
            <p className="text-sm font-semibold leading-tight">
              Learn. Build.
              <br />
              Compete. Lead.
            </p>
          </div>
          <div className="float-y absolute -bottom-12 left-3 w-[88%] max-w-[330px] sm:-left-8 lg:-left-12 2xl:max-w-[400px]">
            <MemberCard />
          </div>
        </div>
      </div>
    </section>
  );
}
