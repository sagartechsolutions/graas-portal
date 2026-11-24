import Link from "next/link";
import Icon, { IconTile } from "@/components/ui/Icon";
import Photo from "@/components/ui/Photo";
import Reveal from "@/components/ui/Reveal";
import { MEMBER_TYPES } from "@/lib/benefits";
import { PHOTOS } from "@/lib/photos";

/** Who GRAAS is for: one card per kind of member, each leading to its full list of benefits. */
export default function Audiences() {
  const types = MEMBER_TYPES.filter((t) => t.key !== "chapter");
  return (
    <section className="section bg-mist">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-sm font-semibold text-go-deep">
              <span className="dot" aria-hidden="true" />
              Who GRAAS is for
            </p>
            <h2 className="h-section mt-3">From a first robot in school to a factory that needs engineers.</h2>
          </div>
          <Link href="/membership" className="btn btn-primary">
            Compare all memberships
          </Link>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {types.map((t, i) => (
            <li key={t.key}>
              <Reveal delay={i * 0.06} className="h-full">
                <Link href={`/membership#${t.key}`} className="card card-lift group flex h-full flex-col overflow-hidden">
                  <span className="relative block h-40 overflow-hidden bg-mist 2xl:h-48">
                    <Photo src={PHOTOS[t.photo].src} alt={PHOTOS[t.photo].alt} sizes="(min-width: 1280px) 20vw, (min-width: 640px) 50vw, 100vw" className="h-full w-full transition-transform duration-700 group-hover:scale-[1.06]" />
                    <span className="absolute left-3 top-3">
                      <IconTile name={t.icon} tone={i === 4 ? "ink" : "mist"} size={20} />
                    </span>
                    {t.key === "school" && <span className="absolute right-3 top-3 rounded-full bg-go px-2.5 py-1 text-xs font-bold text-white">Free</span>}
                  </span>
                  <span className="flex flex-1 flex-col p-5">
                    <span className="text-lg font-semibold">{t.short}</span>
                    <span className="mt-1.5 text-[0.95rem] text-ink2">{t.promise}</span>
                    <span className="mt-auto flex items-center gap-2 pt-4 text-sm font-semibold">
                      What you get
                      <Icon name="arrow" size={16} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
