"use client";

import Link from "next/link";
import { motion, useScroll, useSpring } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/browser";
import { NAV, PROGRAMS } from "@/lib/site";
import Logo from "./Logo";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  // Where a signed-in login goes: staff to Admin, chapter logins to their console, members to My account.
  const [home, setHome] = useState({ href: "/account", label: "My account" });
  const staffArea = pathname.startsWith("/admin");
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const sb = browserClient();
    sb.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = sb.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!signedIn) return;
    browserClient()
      .rpc("my_role")
      .then(({ data }) => {
        if (data?.staff && !data?.member) setHome({ href: "/admin", label: "Admin" });
        else if (data?.coordinator && !data?.member) setHome({ href: "/chapter", label: "Chapter console" });
        else if (data?.expert && !data?.member) setHome({ href: "/studio", label: "Expert studio" });
        else setHome({ href: "/account", label: "My account" });
      });
  }, [signedIn]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  // Close the phone menu whenever the page changes.
  useEffect(() => {
    Promise.resolve().then(() => setOpen(false));
  }, [pathname]);

  const here = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));
  const item = (href: string) =>
    `relative rounded-full px-2.5 py-2 text-[0.92rem] font-medium transition-colors hover:bg-mist 2xl:px-3.5 2xl:text-[0.95rem] ${here(href) ? "text-ink" : "text-ink2 hover:text-ink"}`;
  const inMore = PROGRAMS.some((p) => here(p.href));

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300 ${
          scrolled || open ? "border-b border-line bg-white/85 backdrop-blur-xl" : "border-b border-transparent bg-white"
        }`}
      >
        <div className="shell flex h-[4.5rem] items-center justify-between gap-4">
          <Link href="/" aria-label="GRAAS home" className="shrink-0">
            <Logo />
          </Link>
          <nav aria-label="Main" className={`hidden items-center gap-0 ${staffArea ? "" : "min-[1360px]:flex"}`}>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={item(n.href)} aria-current={here(n.href) ? "page" : undefined}>
                {n.label}
                {here(n.href) && <span aria-hidden="true" className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-go" />}
              </Link>
            ))}
            <div className="group relative">
              <button type="button" className={`${item("#more")} inline-flex items-center gap-1.5 ${inMore ? "!text-ink" : ""}`} aria-haspopup="true">
                More
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="transition-transform group-hover:rotate-180 group-focus-within:rotate-180">
                  <path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="invisible absolute right-0 top-full w-80 translate-y-1 pt-3 opacity-0 transition-all duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <div className="card grid gap-0.5 p-2 shadow-[var(--shadow-lift)]">
                  {PROGRAMS.map((p) => (
                    <Link key={p.href} href={p.href} className="flex flex-col rounded-xl px-3.5 py-2.5 transition-colors hover:bg-mist">
                      <span className="font-semibold">{p.label}</span>
                      <span className="text-sm text-ink2">{p.note}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </nav>
          <div className="flex items-center gap-2.5">
            {staffArea ? (
              <Link href="/" className="btn btn-ghost !min-h-11 !px-5">
                View website
              </Link>
            ) : (
              <>
                <Link href={signedIn ? home.href : "/signin"} className="hidden whitespace-nowrap rounded-full px-3.5 py-2 text-[0.95rem] font-semibold transition-colors hover:bg-mist sm:inline-flex">
                  {signedIn ? home.label : "Sign in"}
                </Link>
                {!signedIn && (
                  <Link href="/join" className="btn btn-primary hidden whitespace-nowrap !min-h-11 !px-5 sm:inline-flex">
                    <span className="2xl:hidden">Join</span>
                    <span className="hidden 2xl:inline">Become a member</span>
                  </Link>
                )}
              </>
            )}
            <button
              type="button"
              className={`h-11 w-11 items-center justify-center rounded-full border border-line bg-white ${staffArea ? "hidden" : "flex min-[1360px]:hidden"}`}
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
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-[4.5rem] z-40 overflow-y-auto bg-white min-[1360px]:hidden">
          <nav aria-label="Mobile" className="shell flex flex-col py-5">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`flex items-center justify-between border-b border-line py-3.5 text-2xl font-semibold tracking-tight ${here(n.href) ? "text-ink" : "text-ink2"}`}>
                {n.label}
                {here(n.href) && <span className="dot" aria-hidden="true" />}
              </Link>
            ))}
            <p className="mt-6 text-sm font-semibold text-slate7">More</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PROGRAMS.map((p) => (
                <Link key={p.href} href={p.href} onClick={() => setOpen(false)} className="rounded-xl bg-mist px-3.5 py-3 font-semibold">
                  {p.label}
                </Link>
              ))}
            </div>
            <Link href={signedIn ? home.href : "/join"} onClick={() => setOpen(false)} className="btn btn-primary mt-7">
              {signedIn ? home.label : "Become a member"}
            </Link>
            {!signedIn && (
              <Link href="/signin" onClick={() => setOpen(false)} className="btn btn-ghost mt-3">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
