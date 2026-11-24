import type { ReactNode } from "react";
import Link from "next/link";
import JoinBand from "@/components/home/JoinBand";
import Photo from "@/components/ui/Photo";
import { PHOTOS, type PhotoKey } from "@/lib/photos";

export type Block = { heading: string; body?: string; points?: string[] };

const BY_INTEREST: Record<string, PhotoKey> = {
  lectures: "learn",
  chapter: "chapters",
  competitions: "rovers",
  industry: "industry",
  graascon: "assembly",
  membership: "engineer",
};

/** Shared layout for the inner pages: title and photograph, what the area offers, and a way to reserve a place. */
export default function InfoPage({
  title,
  intro,
  status,
  blocks,
  steps,
  stepsTitle,
  interest,
  photo,
  children,
}: {
  title: string;
  intro: string;
  status?: string;
  blocks: Block[];
  steps?: string[];
  stepsTitle?: string;
  interest?: string;
  photo?: PhotoKey;
  cta?: { title: string; intro: string };
  children?: ReactNode;
}) {
  const p = PHOTOS[photo ?? BY_INTEREST[interest ?? ""] ?? "bluearm"];
  return (
    <>
      <section className="shell grid items-center gap-7 pb-10 pt-8 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pb-14 lg:pt-10">
        <div>
          {status && (
            <p className="chip">
              <span className="dot" />
              {status}
            </p>
          )}
          <h1 className="h-display mt-5 !text-[clamp(2.4rem,1.5rem+3.6vw,4.1rem)]">{title}</h1>
          <p className="lede mt-5">{intro}</p>
          <p className="mt-8">
            <Link href="/join" className="btn btn-primary">
              Become a member
            </Link>
          </p>
        </div>
        <div className="aspect-[4/3] overflow-hidden rounded-[28px]">
          <Photo src={p.src} alt={p.alt} eager sizes="(min-width: 1024px) 560px, 100vw" className="h-full w-full" />
        </div>
      </section>

      <section className="bg-mist">
        <div className="shell section">
          <div className="grid gap-5 md:grid-cols-2">
            {blocks.map((b) => (
              <div key={b.heading} className="card p-6 sm:p-8">
                <h2 className="h-card !text-2xl">{b.heading}</h2>
                {b.body && <p className="mt-3 text-ink2">{b.body}</p>}
                {b.points && (
                  <ul className="mt-4 grid gap-2.5">
                    {b.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-3">
                        <svg width="18" height="18" viewBox="0 0 18 18" className="mt-1 shrink-0" aria-hidden="true">
                          <path d="M3.5 9.5 7.2 13 14.5 5" fill="none" stroke="#067a2e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {pt}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          {steps && (
            <div className="mt-12">
              <h2 className="h-section">{stepsTitle}</h2>
              <ol className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {steps.map((s, i) => (
                  <li key={s} className="card p-6">
                    <span className="readout flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm text-white">{i + 1}</span>
                    <p className="mt-4 text-lg font-semibold leading-snug">{s}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>
      {children}
      <JoinBand />
    </>
  );
}
