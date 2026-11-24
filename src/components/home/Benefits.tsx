import Link from "next/link";
import type { ReactNode } from "react";
import Photo from "@/components/ui/Photo";
import Reveal from "@/components/ui/Reveal";
import { PHOTOS, type PhotoKey } from "@/lib/photos";
import {
  CertificateArt,
  ChapterGraph,
  ProblemCards,
  VerifyScan,
} from "./Illustrations";

function Tile({
  title,
  body,
  href,
  linkLabel,
  span,
  delay = 0,
  children,
}: {
  title: string;
  body: string;
  href?: string;
  linkLabel?: string;
  span: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <li className={span}>
      <Reveal delay={delay} className="h-full">
        <div className="card card-lift group flex h-full flex-col overflow-hidden">
        <div className="relative h-56 overflow-hidden bg-mist sm:h-64 2xl:h-80 min-[1800px]:h-[26rem]">
          {children}
        </div>
        <div className="flex flex-1 flex-col p-6 sm:p-7">
          <h3 className="h-card">{title}</h3>
          <p className="mt-2 text-ink2">{body}</p>
          {href && (
            <p className="mt-auto pt-5">
              <Link href={href} className="link text-[0.95rem]">
                {linkLabel}
              </Link>
            </p>
          )}
        </div>
        </div>
      </Reveal>
    </li>
  );
}

function Shot({ k, sizes }: { k: PhotoKey; sizes: string }) {
  return (
    <Photo
      src={PHOTOS[k].src}
      alt={PHOTOS[k].alt}
      sizes={sizes}
      className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
    />
  );
}

const wide = "(min-width: 1024px) 700px, 100vw";

export default function Benefits() {
  return (
    <section id="benefits" className="section">
      <div className="shell">
        <div className="max-w-3xl">
          <h2 className="h-section">What membership gives you.</h2>
          <p className="lede mt-4">
            One membership covers how you learn, who you build with, where you
            compete and how industry finds you.
          </p>
        </div>
        <ul className="mt-8 grid gap-5 lg:grid-cols-12">
          <Tile
            span="lg:col-span-7"
            title="Live lectures and courses"
            body="Open lectures you can join live, replays with notes, and courses that end in a project and an assessment."
            href="/learn"
            linkLabel="How learning works"
          >
            <Shot k="learn" sizes={wide} />
          </Tile>
          <Tile
            span="lg:col-span-5"
            delay={0.1}
            title="A verified digital member ID"
            body="An ID with a QR code that a college, an event desk or an employer can check in seconds."
          >
            <VerifyScan />
          </Tile>
          <Tile
            span="lg:col-span-5"
            title="A chapter on your own campus"
            body="Bring classmates and a faculty coordinator together, and GRAAS gives the chapter a workspace of its own."
            href="/chapters"
            linkLabel="Start a chapter"
          >
            <div className="grid-faint absolute inset-0 p-5">
              <ChapterGraph />
            </div>
          </Tile>
          <Tile
            span="lg:col-span-7"
            delay={0.1}
            title="Workshops and competitions"
            body="Hands-on workshops, robot challenges and inter-college competitions, with member pricing on paid events."
            href="/events"
            linkLabel="See the events plan"
          >
            <Shot k="rovers" sizes={wide} />
          </Tile>
          <Tile
            span="lg:col-span-7"
            title="Real problems from industry"
            body="Companies post jobs, internships and automation problems. Members and chapters take them on."
            href="/industry"
            linkLabel="For companies"
          >
            <Shot k="industry" sizes={wide} />
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/55 via-ink/10 to-transparent p-5">
              <ProblemCards />
            </div>
          </Tile>
          <Tile
            span="lg:col-span-5"
            delay={0.1}
            title="Certificates anyone can verify"
            body="Attending earns a participation certificate. Passing the assessment earns a completion certificate with its own QR code."
          >
            <CertificateArt />
          </Tile>
        </ul>
      </div>
    </section>
  );
}
