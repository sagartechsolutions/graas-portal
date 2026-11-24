"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import ArmStage from "@/components/fx/ArmStage";

const WORDS = ["Build", "Program", "Race", "Deploy"];

export default function Hero() {
  const [word, setWord] = useState(0);
  const onPlace = useCallback((i: number) => setWord(i), []);

  return (
    <section className="relative overflow-hidden border-b-2 border-ink">
      <div
        aria-hidden="true"
        className="blueprint absolute inset-0 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
      />
      <div className="relative mx-auto grid max-w-[1320px] px-5 pt-8 sm:px-8 lg:min-h-[calc(100svh-4rem)] lg:max-h-[860px] lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-6 lg:pt-12">
        <h1
          className="display text-[clamp(3.5rem,13vw,6.6rem)] lg:col-start-1 lg:row-start-1 xl:text-[7.2rem]"
          aria-label="Don’t just study robots. Build them."
        >
          <span aria-hidden="true" className="block">
            Don’t just study robots.
          </span>
          <span aria-hidden="true" className="mt-[0.1em] flex flex-wrap items-center gap-x-[0.16em]">
            <span className="inline-flex min-w-[2.85em] justify-center overflow-clip whitespace-nowrap rounded-[0.09em] border-2 border-ink bg-signal px-[0.1em] pb-[0.04em] pt-[0.08em]">
              <span key={word} className="slot-word">
                {WORDS[word]}
              </span>
            </span>
            <span>them.</span>
          </span>
        </h1>
        <div className="relative -mx-5 mt-4 h-[310px] sm:mx-0 sm:h-[420px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:h-auto">
          <ArmStage words={WORDS} onPlace={onPlace} />
        </div>
        <div className="pb-10 pt-6 lg:col-start-1 lg:row-start-2 lg:pb-14 lg:pt-7">
          <p className="lede">
            GRAAS is the robotics and automation society for students, colleges and industry: live lectures, a chapter
            in your own college, competitions, and real problems from real factories.
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <Link href="/#pre-register" className="btn btn-go">
              Pre-register free
            </Link>
            <Link href="/#journey" className="btn btn-quiet">
              See what members do
            </Link>
          </div>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-ink2">
            <span className="pointer-coarse:hidden">
              That arm is live. Move over it to steer, click a block to grab it, click above the belt to drop it.
            </span>
            <span className="hidden pointer-coarse:inline">
              That arm is live. Tap anywhere to move it, tap a block to grab it, tap above the belt to drop it.
            </span>{" "}
            Every block it places changes the headline.
          </p>
        </div>
      </div>
    </section>
  );
}
