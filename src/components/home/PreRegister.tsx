"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { INTERESTS, LEAD_KINDS } from "@/lib/site";

type Result = { serial: number; code: string; existing: boolean; name: string; kind: string };

function Odometer({ value }: { value: number }) {
  const digits = String(value).padStart(4, "0").split("");
  const [go, setGo] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGo(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <span className="readout inline-flex overflow-hidden rounded-md border-2 border-ink bg-ink text-white" aria-label={`Number ${value}`}>
      {digits.map((d, i) => (
        <span key={i} className="relative h-[1.25em] w-[0.72em] overflow-hidden border-l border-white/20 first:border-0" aria-hidden="true">
          <span
            className="absolute left-0 top-0 flex w-full flex-col items-center transition-transform ease-[cubic-bezier(0.2,0.9,0.2,1)]"
            style={{ transform: `translateY(${go ? -Number(d) * 1.25 : 0}em)`, transitionDuration: `${900 + i * 260}ms` }}
          >
            {"0123456789".split("").map((n) => (
              <span key={n} className="flex h-[1.25em] items-center">
                {n}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

function Pass({ r }: { r: Result }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/?ref=${r.code}`;
  const text = `I just pre-registered with GRAAS, the robotics and automation society. Get your number here: ${link}`;
  const label = LEAD_KINDS.find((k) => k.value === r.kind)?.label ?? "Member";
  return (
    <div className="mx-auto max-w-xl" role="status">
      <div className="h-3 rounded-t-lg border-2 border-b-0 border-ink bg-ink" aria-hidden="true" />
      <div className="print-out plate overflow-hidden !rounded-t-none">
        <div className="hazard h-3" aria-hidden="true" />
        <div className="p-6 sm:p-8">
          <p className="wide text-sm text-cobalt">GRAAS pre-registration pass</p>
          <p className="display mt-3 break-words text-5xl sm:text-6xl">{r.name}</p>
          <p className="mt-1 text-ink2">{label}</p>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink2">Your number</p>
              <p className="mt-1 text-5xl font-bold leading-none">
                <Odometer value={r.serial} />
              </p>
            </div>
            <p className="readout text-sm text-ink2">Invite code {r.code}</p>
          </div>
          <p className="mt-6 text-ink2">
            {r.existing
              ? "This mobile number was already on the list, so this is your original pass."
              : "You are on the list."}{" "}
            We will message you the day membership opens. Keep this number handy.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className="btn btn-go" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
              Share on WhatsApp
            </a>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => navigator.clipboard?.writeText(link).then(() => setCopied(true))}
            >
              {copied ? "Invite link copied" : "Copy invite link"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PreRegister({
  interest,
  contact = false,
  title = "Get your number before the doors open",
  intro = "Membership opens soon. Pre-register now and we will message you the day it does.",
}: {
  interest?: string;
  contact?: boolean;
  title?: string;
  intro?: string;
}) {
  const [kind, setKind] = useState<string>(contact ? "other" : "student");
  const [picked, setPicked] = useState<string[]>(interest ? [interest] : []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ field?: string; error: string } | null>(null);
  const [done, setDone] = useState<Result | null>(null);

  useEffect(() => {
    const onKind = (e: Event) => setKind((e as CustomEvent<string>).detail);
    window.addEventListener("graas:kind", onKind);
    return () => window.removeEventListener("graas:kind", onKind);
  }, []);

  const org = LEAD_KINDS.find((k) => k.value === kind)?.org ?? "Organisation";
  const bad = (f: string) => (err?.field === f ? { "aria-invalid": true as const, "aria-describedby": "form-error" } : {});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const q = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    q.forEach((v, k) => k.startsWith("utm_") && (utm[k] = v.slice(0, 80)));
    const name = String(f.get("full_name") ?? "").trim();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/prereg", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          full_name: name,
          phone: f.get("phone"),
          email: f.get("email"),
          organisation: f.get("organisation"),
          city: f.get("city"),
          message: f.get("message"),
          interests: picked,
          is_adult: f.get("is_adult") === "on",
          consent_contact: f.get("consent_contact") === "on",
          website: f.get("website"),
          source: window.location.pathname,
          ref: q.get("ref") ?? "",
          utm,
        }),
      });
      const data = await res.json();
      if (data?.ok) setDone({ serial: data.serial, code: data.code, existing: !!data.existing, name, kind });
      else setErr({ field: data?.field, error: data?.error ?? "Something went wrong. Please try again." });
    } catch {
      setErr({ error: "No connection. Check your internet and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="pre-register" className="blueprint border-t-2 border-ink">
      <div className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 lg:py-24">
        {done && contact ? (
          <div className="plate mx-auto max-w-xl p-8" role="status">
            <p className="display text-5xl">Message sent.</p>
            <p className="mt-3 text-ink2">Thank you, {done.name.split(" ")[0]}. Someone from GRAAS will reply on the number or email you gave.</p>
          </div>
        ) : done ? (
          <Pass r={done} />
        ) : (
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <h2 className="display text-6xl sm:text-7xl lg:text-8xl">{title}</h2>
              <p className="lede mt-5">{intro}</p>
            </div>
            <form onSubmit={submit} className="plate grid gap-4 p-5 sm:p-8" noValidate>
              {!contact && (
                <label className="grid gap-1.5 font-semibold">
                  I am a
                  <select name="kind" className="field" value={kind} onChange={(e) => setKind(e.target.value)} {...bad("kind")}>
                    {LEAD_KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 font-semibold">
                  Full name
                  <input name="full_name" className="field" autoComplete="name" required maxLength={80} {...bad("full_name")} />
                </label>
                <label className="grid gap-1.5 font-semibold">
                  Mobile number (WhatsApp)
                  <input name="phone" className="field" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit number" required maxLength={14} {...bad("phone")} />
                </label>
                <label className="grid gap-1.5 font-semibold">
                  <span>
                    Email <span className="font-normal text-ink2">(optional)</span>
                  </span>
                  <input name="email" className="field" type="email" autoComplete="email" maxLength={160} {...bad("email")} />
                </label>
                <label className="grid gap-1.5 font-semibold">
                  City
                  <input name="city" className="field" autoComplete="address-level2" maxLength={80} />
                </label>
              </div>
              <label className="grid gap-1.5 font-semibold">
                {org}
                <input name="organisation" className="field" autoComplete="organization" maxLength={120} />
              </label>
              {contact ? (
                <label className="grid gap-1.5 font-semibold">
                  Your message
                  <textarea name="message" className="field min-h-32" maxLength={1000} required />
                </label>
              ) : (
                <fieldset>
                  <legend className="font-semibold">Tell me about</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {INTERESTS.map((t) => {
                      const on = picked.includes(t.value);
                      return (
                        <label
                          key={t.value}
                          className={`cursor-pointer rounded-full border-[1.5px] px-3.5 py-1.5 text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cobalt ${
                            on ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={on}
                            onChange={() => setPicked((v) => (on ? v.filter((x) => x !== t.value) : [...v, t.value]))}
                          />
                          {t.label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
              <div className="hidden" aria-hidden="true">
                <label>
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              <label className="flex items-start gap-3 text-[0.95rem]">
                <input type="checkbox" name="is_adult" className="mt-1 h-5 w-5 shrink-0 accent-[#1f3fff]" {...bad("is_adult")} />
                <span>{kind === "parent" ? "I am 18 or older and the parent or guardian of the student." : "I am 18 or older."}</span>
              </label>
              <label className="flex items-start gap-3 text-[0.95rem]">
                <input type="checkbox" name="consent_contact" className="mt-1 h-5 w-5 shrink-0 accent-[#1f3fff]" {...bad("consent_contact")} />
                <span>
                  GRAAS may contact me by WhatsApp, phone or email about the launch and my membership.{" "}
                  <Link href="/privacy" className="font-semibold text-cobalt underline underline-offset-4">
                    How we use your details
                  </Link>
                </span>
              </label>
              {err && (
                <p id="form-error" role="alert" className="rounded-lg border-[1.5px] border-[#c2261a] bg-[#fff1ef] px-4 py-3 font-semibold text-[#8f1a11]">
                  {err.error}
                </p>
              )}
              <button type="submit" className="btn btn-go justify-self-start" disabled={busy}>
                {busy ? "Saving…" : contact ? "Send message" : "Pre-register"}
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
