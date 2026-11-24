import Link from "next/link";
import { NAV, ORG } from "@/lib/site";
import { Logo } from "./Header";

export default function Footer() {
  return (
    <footer className="mt-auto border-t-2 border-ink bg-surface">
      <div className="hazard h-2.5" aria-hidden="true" />
      <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-ink2">
            {ORG.name}. A society for people who learn, teach, build and hire in robotics and automation.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-2 self-start font-semibold">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="py-1 hover:text-cobalt">
              {n.label}
            </Link>
          ))}
          <Link href="/about" className="py-1 hover:text-cobalt">
            About
          </Link>
          <Link href="/contact" className="py-1 hover:text-cobalt">
            Contact
          </Link>
        </nav>
        <div className="self-start">
          <Link href="/#pre-register" className="btn btn-go">
            Pre-register free
          </Link>
          <p className="mt-5 text-sm text-ink2">
            <Link href="/privacy" className="underline underline-offset-4 hover:text-cobalt">
              Privacy
            </Link>
          </p>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-[1320px] px-5 py-5 text-sm text-ink2 sm:px-8">
          © {2026} {ORG.name}
        </p>
      </div>
    </footer>
  );
}
