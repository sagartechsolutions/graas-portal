import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/site/Logo";
import Icon, { IconTile } from "@/components/ui/Icon";
import Photo from "@/components/ui/Photo";
import Reveal from "@/components/ui/Reveal";
import { PHOTOS, type PhotoKey } from "@/lib/photos";

/** A section heading: a small label with the logo's dot, the title and a short introduction. */
export function SectionHead({ kicker, title, intro, action, center = false }: { kicker?: string; title: ReactNode; intro?: ReactNode; action?: ReactNode; center?: boolean }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-6 ${center ? "flex-col items-center text-center" : ""}`}>
      <div className={`max-w-3xl ${center ? "mx-auto" : ""}`}>
        {kicker && (
          <p className={`flex items-center gap-2 text-sm font-semibold text-go-deep ${center ? "justify-center" : ""}`}>
            <span className="dot" aria-hidden="true" />
            {kicker}
          </p>
        )}
        <h2 className="h-section mt-3">{title}</h2>
        {intro && <p className={`lede mt-4 ${center ? "mx-auto" : ""}`}>{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export type Feature = { icon: string; title: string; text: string };

/** Cards with an icon, a title and a sentence, brought in one after another. */
export function FeatureGrid({ items, cols = "md:grid-cols-2 xl:grid-cols-4", tone = "mist" }: { items: Feature[]; cols?: string; tone?: "mist" | "green" | "ink" }) {
  return (
    <ul className={`grid gap-4 sm:gap-5 ${cols}`}>
      {items.map((f, i) => (
        <li key={f.title}>
          <Reveal delay={(i % 4) * 0.07} className="h-full">
            <div className="card card-lift group h-full p-6">
              <span className="inline-flex transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:rotate-[-4deg]">
                <IconTile name={f.icon} tone={tone} />
              </span>
              <h3 className="mt-4 text-lg font-semibold leading-snug tracking-tight">{f.title}</h3>
              <p className="mt-2 text-[0.97rem] text-ink2">{f.text}</p>
            </div>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

/** Numbered steps on a rail, for "how it works". */
export function StepsRail({ steps, dark = false }: { steps: { title: string; text?: string }[]; dark?: boolean }) {
  return (
    <ol className="relative grid gap-4 md:grid-cols-2 xl:grid-flow-col xl:auto-cols-fr xl:grid-cols-none">
      <span aria-hidden="true" className={`absolute left-0 right-0 top-[1.35rem] hidden h-px xl:block ${dark ? "bg-white/15" : "bg-line"}`}>
        <span className="rail-fill block h-full origin-left bg-go" />
      </span>
      {steps.map((s, i) => (
        <li key={s.title} className="relative">
          <Reveal delay={i * 0.08}>
            <span className={`readout relative z-10 flex h-11 w-11 items-center justify-center rounded-full text-base ${dark ? "bg-white text-ink" : "bg-ink text-white"}`}>
              {i + 1}
              {i === steps.length - 1 && <span aria-hidden="true" className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-go" />}
            </span>
            <div className={`mt-4 rounded-2xl p-5 ${dark ? "bg-white/[0.06]" : "card"}`}>
              <p className="text-lg font-semibold leading-snug">{s.title}</p>
              {s.text && <p className={`mt-1.5 text-[0.95rem] ${dark ? "text-white/70" : "text-ink2"}`}>{s.text}</p>}
            </div>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}

/** Questions and answers that open in place. */
export function FaqList({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="border-t border-line">
      {items.map((x) => (
        <details key={x.q} className="faq group border-b border-line">
          <summary className="flex items-center justify-between gap-6 py-4 text-lg font-semibold sm:py-5 sm:text-xl">
            {x.q}
            <span className="faq-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line group-open:border-ink group-open:bg-ink group-open:text-white" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
          </summary>
          <div className="max-w-3xl pb-6 text-ink2">{x.a}</div>
        </details>
      ))}
    </div>
  );
}

/** A tick list. */
export function Ticks({ items, light = false }: { items: string[]; light?: boolean }) {
  return (
    <ul className="grid gap-2.5">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-3">
          <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${light ? "bg-white/10 text-go" : "bg-go-soft text-go-deep"}`}>
            <Icon name="check" size={13} strokeWidth={2.6} />
          </span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The opening of an inner page: a large title, an introduction, actions, and a photograph with small cards floating
 * over it. The logo's bars rise faintly behind the text.
 */
export function PageHero({
  kicker,
  title,
  intro,
  actions,
  photo,
  badges = [],
  children,
}: {
  kicker?: string;
  title: ReactNode;
  intro: ReactNode;
  actions?: ReactNode;
  photo: PhotoKey;
  badges?: { icon: string; title: string; text: string }[];
  children?: ReactNode;
}) {
  const p = PHOTOS[photo];
  return (
    <section className="relative overflow-hidden">
      <svg aria-hidden="true" viewBox="80 38 382 340" className="pointer-events-none absolute -left-[4%] bottom-0 hidden h-[78%] opacity-[0.035] lg:block">
        <g className="bars-rise">
          <path d="M114 380V279L139.5 246L165 279V380Z" fill="#000e21" />
          <path d="M200 380V220L225 186L250 220V380Z" fill="#000e21" />
          <path d="M284 380V167L309.5 132L335 167V380Z" fill="#000e21" />
          <path d="M372 380V123L397.5 89L423 123V380Z" fill="#000e21" />
        </g>
      </svg>
      <div className="shell relative grid items-center gap-9 pb-12 pt-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pb-16 lg:pt-10">
        <div>
          {kicker && (
            <p className="chip">
              <span className="dot dot-live" />
              {kicker}
            </p>
          )}
          <h1 className="h-display mt-5 !text-[clamp(2.4rem,1.4rem+3.6vw,4.6rem)]">{title}</h1>
          <div className="lede mt-5">{intro}</div>
          {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
          {children}
        </div>
        <div className="relative mx-auto w-full max-w-[640px] lg:mr-0 lg:max-w-none">
          <div className="relative aspect-[4/3.3] overflow-hidden rounded-[28px] lg:rounded-[36px]">
            <Photo src={p.src} alt={p.alt} eager sizes="(min-width: 1024px) 48vw, 100vw" className="kenburns h-full w-full" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
          </div>
          <div className="absolute right-4 top-4 flex items-center gap-2.5 rounded-2xl border border-white/60 bg-white/85 py-2 pl-2.5 pr-4 shadow-[var(--shadow-card)] backdrop-blur-md">
            <LogoMark size={30} animate />
            <span className="text-sm font-semibold leading-tight">GRAAS</span>
          </div>
          {badges.slice(0, 2).map((b, i) => (
            <div
              key={b.title}
              className={`float-y absolute hidden max-w-[17rem] items-start gap-3 rounded-2xl border border-line bg-white/95 p-3.5 shadow-[var(--shadow-lift)] backdrop-blur sm:flex ${i === 0 ? "-bottom-6 left-4 lg:-left-8" : "bottom-16 right-3 lg:-right-5"}`}
              style={{ animationDelay: `${i * 1.6}s` }}
            >
              <IconTile name={b.icon} tone={i === 0 ? "green" : "ink"} size={20} />
              <span>
                <span className="block font-semibold leading-tight">{b.title}</span>
                <span className="mt-0.5 block text-sm text-ink2">{b.text}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** A small "go there" card used to point between pages. */
export function LinkCard({ href, icon, title, text }: { href: string; icon: string; title: string; text: string }) {
  return (
    <Link href={href} className="card card-lift group flex items-start gap-4 p-5">
      <IconTile name={icon} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-ink2">{text}</span>
      </span>
      <Icon name="arrow" size={20} className="mt-1 shrink-0 text-ink2 transition-transform group-hover:translate-x-1 group-hover:text-ink" />
    </Link>
  );
}
