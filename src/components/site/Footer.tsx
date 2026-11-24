import Link from "next/link";
import { ORG, PROGRAMS } from "@/lib/site";
import Logo from "./Logo";

const cols = [
  { title: "Membership", links: [{ href: "/membership", label: "Plans and benefits" }, { href: "/#join", label: "Become a member" }, { href: "/chapters", label: "Start a chapter" }] },
  { title: "Programs", links: PROGRAMS.map((p) => ({ href: p.href, label: p.label })).concat([{ href: "/graascon", label: "GRAASCON" }]) },
  { title: "Society", links: [{ href: "/about", label: "About GRAAS" }, { href: "/updates", label: "Updates" }, { href: "/gallery", label: "Gallery" }, { href: "/contact", label: "Contact" }] },
];

export default function Footer() {
  return (
    <footer className="mt-auto bg-ink text-white">
      <div className="shell grid gap-12 py-16 lg:grid-cols-[1.4fr_2fr]">
        <div>
          <Logo tone="light" full />
          <p className="mt-6 max-w-sm text-white/70">A society for people who learn, teach, build and hire in robotics and automation.</p>
          <Link href="/#join" className="btn btn-light mt-7">
            Become a member
          </Link>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-sm font-semibold text-white/55">{c.title}</p>
              <ul className="mt-4 grid gap-2.5">
                {c.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-white/85 transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-6 text-sm text-white/55">
          <p>
            © {2026} {ORG.name}
          </p>
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
