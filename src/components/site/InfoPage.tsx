import type { ReactNode } from "react";
import PreRegister from "@/components/home/PreRegister";

export type Block = { heading: string; body?: string; points?: string[] };

/** Shared layout for the inner pages: a large title, plain blocks of what the area offers, and a way to hear about it. */
export default function InfoPage({
  title,
  intro,
  status,
  blocks,
  steps,
  stepsTitle,
  interest,
  cta,
  children,
}: {
  title: string;
  intro: string;
  status?: string;
  blocks: Block[];
  steps?: string[];
  stepsTitle?: string;
  interest?: string;
  cta?: { title: string; intro: string };
  children?: ReactNode;
}) {
  return (
    <>
      <section className="blueprint border-b-2 border-ink">
        <div className="mx-auto max-w-[1320px] px-5 pb-14 pt-12 sm:px-8 lg:pb-20 lg:pt-20">
          <h1 className="display max-w-5xl text-[clamp(3.4rem,11vw,7.5rem)]">{title}</h1>
          <p className="lede mt-6 !max-w-2xl">{intro}</p>
          {status && <p className="mt-6 inline-block rounded-md bg-hazard px-3 py-1.5 text-sm font-bold">{status}</p>}
        </div>
      </section>
      <section className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid gap-x-12 gap-y-12 md:grid-cols-2">
          {blocks.map((b) => (
            <div key={b.heading} className="border-t-2 border-ink pt-5">
              <h2 className="display text-4xl sm:text-5xl">{b.heading}</h2>
              {b.body && <p className="mt-3 max-w-xl text-lg leading-relaxed text-ink2">{b.body}</p>}
              {b.points && (
                <ul className="mt-4 grid max-w-xl gap-2.5 text-lg">
                  {b.points.map((p) => (
                    <li key={p} className="flex items-start gap-3">
                      <span aria-hidden="true" className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-signal ring-2 ring-ink" />
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        {steps && (
          <div className="mt-16">
            <h2 className="display text-5xl sm:text-6xl">{stepsTitle}</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s} className="plate-soft p-5">
                  <span className="readout flex h-9 w-9 items-center justify-center rounded-full bg-ink font-bold text-white">{i + 1}</span>
                  <p className="mt-3 text-lg font-semibold leading-snug">{s}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
      {children}
      <PreRegister interest={interest} title={cta?.title} intro={cta?.intro} />
    </>
  );
}
