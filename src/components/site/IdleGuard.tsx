"use client";

import { useEffect, useRef, useState } from "react";
import { IDLE_MS, IDLE_WARN_MS, browserClient, clearActive, isLeaving, isOwnDevice, lastActive, markActive, setOwnDevice, signOutAndReset } from "@/lib/browser";

/**
 * Signs a person out after 30 minutes without activity, unless they marked this browser as their own device.
 * Two minutes before, a box asks "Still there?". Activity in any tab of this browser keeps everyone signed in.
 * Coming back to the site more than 30 minutes after the last activity (for example on a shared computer the
 * next day) signs the old session out straight away.
 */
const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "scroll", "mousemove"] as const;

export default function IdleGuard() {
  const uid = useRef<string | null>(null);
  const lastWrite = useRef(0);
  const [left, setLeft] = useState<number | null>(null); // milliseconds until sign-out while the warning shows

  useEffect(() => {
    const sb = browserClient();
    const out = () => {
      if (!isLeaving()) void signOutAndReset("/signin?idle=1");
    };
    const check = () => {
      const id = uid.current;
      if (!id || isOwnDevice(id) || isLeaving()) return setLeft(null);
      const last = lastActive();
      if (!last) {
        markActive();
        return setLeft(null);
      }
      const idle = Date.now() - last;
      if (idle >= IDLE_MS) return out();
      setLeft(idle >= IDLE_MS - IDLE_WARN_MS ? IDLE_MS - idle : null);
    };
    const onActivity = () => {
      if (!uid.current) return;
      const now = Date.now();
      // Write at most every 10 seconds (mouse movement fires constantly).
      if (now - lastWrite.current < 10_000) return;
      // Someone returning after the limit does not get to continue the old session.
      const last = lastActive();
      if (last && now - last >= IDLE_MS && !isOwnDevice(uid.current)) return out();
      lastWrite.current = now;
      markActive();
      setLeft(null);
    };

    const { data } = sb.auth.onAuthStateChange((event, session) => {
      uid.current = session?.user?.id ?? null;
      // Nobody signed in: forget the old activity time, so the next real sign-in starts a fresh clock.
      // (The clock is never restarted on a SIGNED_IN event: the library repeats that event on page load and when
      // a tab is focused again, and a stale session must not get a fresh 30 minutes that way.)
      if (!uid.current) return clearActive();
      if (event === "INITIAL_SESSION") check();
    });
    const visible = () => document.visibilityState === "visible" && check();
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", check);
    const t = window.setInterval(check, 1_000);
    return () => {
      data.subscription.unsubscribe();
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", check);
      window.clearInterval(t);
    };
  }, []);

  if (left == null) return null;
  const s = Math.max(0, Math.ceil(left / 1000));
  const clock = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const stay = () => {
    markActive();
    setLeft(null);
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 p-4 sm:items-center print:hidden" role="alertdialog" aria-modal="true" aria-labelledby="idle-title" aria-describedby="idle-text">
      <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-[var(--shadow-lift)] sm:p-7">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#8a4b00]">
          <span className="h-2 w-2 rounded-full bg-[#e08a00]" aria-hidden="true" />
          Signing out in <span className="readout">{clock}</span>
        </p>
        <h2 id="idle-title" className="h-card mt-2 !text-2xl">
          Still there?
        </h2>
        <p id="idle-text" className="mt-2 text-ink2">
          There has been no activity for almost 30 minutes. To keep your account safe on shared computers, GRAAS signs you out automatically.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" className="btn btn-primary" onClick={stay} autoFocus>
            Stay signed in
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setOwnDevice(uid.current);
              stay();
            }}
          >
            This is my own device
          </button>
        </div>
        <button type="button" className="mt-3 text-[0.95rem] font-semibold underline decoration-go decoration-2 underline-offset-4" onClick={() => void signOutAndReset("/")}>
          Sign out now
        </button>
      </div>
    </div>
  );
}
