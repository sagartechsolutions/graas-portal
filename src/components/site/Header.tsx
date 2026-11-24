"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "@/lib/site";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <path d="M8 26 L17 9 L27 19" fill="none" stroke="#0c1330" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8" cy="26" r="4.5" fill="#ff5b1a" stroke="#0c1330" strokeWidth="2" />
        <circle cx="17" cy="9" r="4.5" fill="#ff5b1a" stroke="#0c1330" strokeWidth="2" />
        <circle cx="27" cy="19" r="3.5" fill="#1f3fff" stroke="#0c1330" strokeWidth="2" />
      </svg>
      <span className="display text-[1.9rem] leading-none tracking-normal">GRAAS</span>
    </span>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        scrolled || open ? "border-ink bg-paper/92 backdrop-blur-md" : "border-transparent bg-paper"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" aria-label="GRAAS home" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-[0.95rem] font-semibold transition-colors hover:bg-cobalt-soft ${
                  active ? "text-cobalt" : "text-ink"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/#pre-register" className="btn btn-go hidden !min-h-10 !py-2 sm:inline-flex">
            Pre-register
          </Link>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg border-[1.5px] border-ink bg-surface lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <path
                d={open ? "M5 5 L17 17 M17 5 L5 17" : "M3 6 H19 M3 11 H19 M3 16 H19"}
                stroke="#0c1330"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div id="mobile-menu" className="blueprint fixed inset-x-0 bottom-0 top-16 overflow-y-auto bg-paper lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col px-5 py-6">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="display border-b border-line py-3 text-5xl">
                {n.label}
              </Link>
            ))}
            <Link href="/about" className="mt-5 py-2 text-lg font-semibold">
              About GRAAS
            </Link>
            <Link href="/contact" className="py-2 text-lg font-semibold">
              Contact
            </Link>
            <Link href="/#pre-register" className="btn btn-go mt-6">
              Pre-register free
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
