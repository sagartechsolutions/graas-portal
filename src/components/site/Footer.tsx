import Link from "next/link";
import { ORG, PROGRAMS } from "@/lib/site";
import Logo from "./Logo";

const cols = [
  { title: "Membership", links: [{ href: "/membership", label: "Benefits and plans" }, { href: "/join", label: "Become a member" }, { href: "/signin", label: "Sign in" }, { href: "/verify", label: "Verify a member" }] },
  { title: "Chapters", links: [{ href: "/chapters", label: "College and school chapters" }, { href: "/chapters/apply", label: "Start a chapter" }, { href: "/chapters/letter", label: "Principal's letter template" }, { href: "/chapter", label: "Chapter console" }] },
  { title: "Society", links: [{ href: "/about", label: "About GRAAS" }, { href: "/industries", label: "Industries" }, ...PROGRAMS.filter((p) => p.href !== "/verify").map((p) => ({ href: p.href, label: p.label })), { href: "/contact", label: "Contact" }] },
  { title: "Rules and policies", links: [{ href: "/policies/membership-rules", label: "Membership rules" }, { href: "/policies/code-of-conduct", label: "Code of conduct" }, { href: "/policies/refund-policy", label: "Refunds" }, { href: "/policies/terms", label: "Terms of use" }, { href: "/policies/privacy", label: "Privacy" }] },
];

export default function Footer() {
  return (
    <footer className="mt-auto bg-ink text-white">
      <div className="shell grid gap-8 py-10 lg:grid-cols-[1.4fr_2fr]">
        <div>
          <Logo tone="light" full />
          <p className="mt-6 max-w-sm text-white/70">India&apos;s society for robotics and automation: school and college students, professionals, institutions and industry, learning and building together.</p>
          <Link href="/join" className="btn btn-light mt-7">
            Become a member
          </Link>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 md:grid-cols-4">
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
          <Link href="/admin" className="hover:text-white">
            Staff sign-in
          </Link>
        </div>
      </div>
    </footer>
  );
}
