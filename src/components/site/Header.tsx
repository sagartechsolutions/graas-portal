"use client";

import Link from "next/link";
import { motion, useScroll, useSpring } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV, PROGRAMS } from "@/lib/site";
import Logo from "./Logo";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const item = (href: string) =>
    `rounded-full px-3.5 py-2 text-[0.95rem] font-medium transition-colors hover:bg-mist ${pathname === href ? "text-ink" : "text-ink2 hover:text-ink"}`;
  const inPrograms = PROGRAMS.some((p) => p.href === pathname);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300 ${
          scrolled || open ? "border-b border-line bg-white/85 backdrop-blur-xl" : "border-b border-transparent bg-white"
        }`}
      >
        <div className="shell flex h-[4.5rem] items-center justify-between gap-4">
          <Link href="/" aria-label="GRAAS home" className="shrink-0" onClick={() => setOpen(false)}>
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
            <Link href="/membership" className={item("/membership")} aria-current={pathname === "/membership" ? "page" : undefined}>
              Membership
            </Link>
            <div className="group relative">
              <button type="button" className={`${item("#")} inline-flex items-center gap-1.5 ${inPrograms ? "!text-ink" : ""}`} aria-haspopup="true">
                Programs
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="transition-transform group-hover:rotate-180 group-focus-within:rotate-180">
                  <path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="invisible absolute left-1/2 top-full w-72 -translate-x-1/2 translate-y-1 pt-3 opacity-0 transition-all duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <div className="card p-2 shadow-[var(--shadow-lift)]">
                  {PROGRAMS.map((p) => (
                    <Link key={p.href} href={p.href} className="flex flex-col rounded-xl px-3.5 py-2.5 transition-colors hover:bg-mist">
                      <span className="font-semibold">{p.label}</span>
                      <span className="text-sm text-ink2">{p.note}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            {NAV.filter((n) => n.href !== "/membership").map((n) => (
              <Link key={n.href} href={n.href} className={item(n.href)} aria-current={pathname === n.href ? "page" : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2.5">
            <Link href="/#join" className="btn btn-primary hidden !min-h-11 !px-5 sm:inline-flex">
              Become a member
            </Link>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path d={open ? "M5 5 15 15M15 5 5 15" : "M3 7h14M3 13h14"} stroke="#000e21" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <motion.div aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 origin-left bg-go" style={{ scaleX: progress }} />
      </header>
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-[4.5rem] z-40 overflow-y-auto bg-white lg:hidden">
          <nav aria-label="Mobile" className="shell flex flex-col py-6">
            {[{ href: "/membership", label: "Membership" }, ...PROGRAMS, ...NAV.filter((n) => n.href !== "/membership"), { href: "/contact", label: "Contact" }].map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-line py-4 text-2xl font-semibold tracking-tight">
                {n.label}
              </Link>
            ))}
            <Link href="/#join" onClick={() => setOpen(false)} className="btn btn-primary mt-7">
              Become a member
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
