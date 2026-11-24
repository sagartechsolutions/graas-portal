"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/site/Logo";
import { INTERESTS, LEAD_KINDS } from "@/lib/site";
import MemberCard from "./MemberCard";

type Result = {
  serial: number;
  code: string;
  existing: boolean;
  name: string;
  kind: string;
};

function Odometer({ value }: { value: number }) {
  const digits = String(value).padStart(4, "0").split("");
  const [go, setGo] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGo(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <span className="readout inline-flex gap-1" aria-label={`Number ${value}`}>
      {digits.map((d, i) => (
        <span
          key={i}
          className="relative h-[1.35em] w-[0.86em] overflow-hidden rounded-lg bg-mist"
          aria-hidden="true"
        >
          <span
            className="absolute left-0 top-0 flex w-full flex-col items-center transition-transform ease-[cubic-bezier(0.2,0.9,0.2,1)]"
            style={{
              transform: `translateY(${go ? -Number(d) * 1.35 : 0}em)`,
              transitionDuration: `${900 + i * 260}ms`,
            }}
          >
            {"0123456789".split("").map((n) => (
              <span key={n} className="flex h-[1.35em] items-center">
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
  const link =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/?ref=${r.code}`;
  const text = `I have reserved my place for GRAAS membership, the robotics and automation society. Reserve yours here: ${link}`;
  const label = LEAD_KINDS.find((k) => k.value === r.kind)?.label ?? "Member";
  return (
    <div
      className="print-out card mx-auto grid max-w-4xl items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr]"
      role="status"
    >
      <MemberCard
        name={r.name}
        role={label}
        badge="Pre-registered"
        idLabel="Invite code"
        idText={r.code}
      />
      <div>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Your place is reserved.
        </h2>
        <p className="mt-2 text-ink2">
          {r.existing
            ? "This mobile number was already on the list, so this is your original number."
            : "You are on the list."}{" "}
          We will message you the day membership opens.
        </p>
        <p className="mt-6 text-sm font-medium text-ink2">
          Your pre-registration number
        </p>
        <p className="mt-1.5 text-5xl font-medium leading-none">
          <Odometer value={r.serial} />
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a
            className="btn btn-primary"
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Share on WhatsApp
          </a>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              navigator.clipboard?.writeText(link).then(() => setCopied(true))
            }
          >
            {copied ? "Invite link copied" : "Copy invite link"}
          </button>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    title: "Tell us who you are",
    text: "It takes a minute. There is nothing to pay.",
  },
  {
    title: "Get your number",
    text: "A pre-registration number, and an invite link to share with classmates and colleagues.",
  },
  {
    title: "Join on opening day",
    text: "We message you the day membership opens, with the fees for each plan.",
  },
];

export default function PreRegister({
  interest,
  contact = false,
  title = "Reserve your place before membership opens.",
  intro = "Membership opens soon. People who pre-register hear first.",
}: {
  interest?: string;
  contact?: boolean;
  title?: string;
  intro?: string;
}) {
  const [kind, setKind] = useState<string>(contact ? "other" : "student");
  const [picked, setPicked] = useState<string[]>(
    interest ? [interest] : ["membership"],
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ field?: string; error: string } | null>(
    null,
  );
  const [done, setDone] = useState<Result | null>(null);

  useEffect(() => {
    const onKind = (e: Event) => setKind((e as CustomEvent<string>).detail);
    window.addEventListener("graas:kind", onKind);
    return () => window.removeEventListener("graas:kind", onKind);
  }, []);

  const org = LEAD_KINDS.find((k) => k.value === kind)?.org ?? "Organisation";
  const bad = (f: string) =>
    err?.field === f
      ? { "aria-invalid": true as const, "aria-describedby": "form-error" }
      : {};

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
      if (data?.ok)
        setDone({
          serial: data.serial,
          code: data.code,
          existing: !!data.existing,
          name,
          kind,
        });
      else
        setErr({
          field: data?.field,
          error: data?.error ?? "Something went wrong. Please try again.",
        });
    } catch {
      setErr({ error: "No connection. Check your internet and try again." });
    } finally {
      setBusy(false);
    }
  }

  const lbl = "grid gap-1.5 text-[0.95rem] font-medium";

  return (
    <section id="join" className="px-3 py-14 sm:px-6 lg:py-20">
      <div className="relative mx-auto max-w-[1320px] overflow-hidden rounded-[28px] bg-ink px-5 py-12 text-white sm:px-10 sm:py-16 lg:rounded-[40px] lg:px-16 lg:py-20">
        <LogoMark
          size={560}
          tone="light"
          className="pointer-events-none absolute -bottom-6 -left-20 hidden opacity-[0.05] lg:block"
        />
        <div className="relative">
          {done && contact ? (
            <div className="card mx-auto max-w-xl p-8 text-ink" role="status">
              <h2 className="text-3xl font-semibold tracking-tight">
                Message sent.
              </h2>
              <p className="mt-3 text-ink2">
                Thank you, {done.name.split(" ")[0]}. Someone from GRAAS will
                reply on the number or email you gave.
              </p>
            </div>
          ) : done ? (
            <div className="text-ink">
              <Pass r={done} />
            </div>
          ) : (
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <div>
                {contact ? (
                  <h1 className="h-section">{title}</h1>
                ) : (
                  <h2 className="h-section">{title}</h2>
                )}
                <p className="lede mt-5 !text-white/75">{intro}</p>
                {!contact && (
                  <ol className="mt-10 grid gap-6">
                    {STEPS.map((s, i) => (
                      <li key={s.title} className="flex gap-4">
                        <span className="readout flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 text-sm">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-lg font-semibold">{s.title}</p>
                          <p className="text-white/70">{s.text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <form
                onSubmit={submit}
                className="grid gap-4 rounded-[24px] bg-white p-5 text-ink shadow-[0_30px_80px_-30px_rgb(0_0_0/0.6)] sm:p-8"
                noValidate
              >
                {!contact && (
                  <label className={lbl}>
                    I am a
                    <select
                      name="kind"
                      className="field"
                      value={kind}
                      onChange={(e) => setKind(e.target.value)}
                      {...bad("kind")}
                    >
                      {LEAD_KINDS.map((k) => (
                        <option key={k.value} value={k.value}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={lbl}>
                    Full name
                    <input
                      name="full_name"
                      className="field"
                      autoComplete="name"
                      required
                      maxLength={80}
                      {...bad("full_name")}
                    />
                  </label>
                  <label className={lbl}>
                    Mobile number (WhatsApp)
                    <input
                      name="phone"
                      className="field"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="10-digit number"
                      required
                      maxLength={14}
                      {...bad("phone")}
                    />
                  </label>
                  <label className={lbl}>
                    <span>
                      Email{" "}
                      <span className="font-normal text-ink2">(optional)</span>
                    </span>
                    <input
                      name="email"
                      className="field"
                      type="email"
                      autoComplete="email"
                      maxLength={160}
                      {...bad("email")}
                    />
                  </label>
                  <label className={lbl}>
                    City
                    <input
                      name="city"
                      className="field"
                      autoComplete="address-level2"
                      maxLength={80}
                    />
                  </label>
                </div>
                <label className={lbl}>
                  {org}
                  <input
                    name="organisation"
                    className="field"
                    autoComplete="organization"
                    maxLength={120}
                  />
                </label>
                {contact ? (
                  <label className={lbl}>
                    Your message
                    <textarea
                      name="message"
                      className="field min-h-32"
                      maxLength={1000}
                      required
                    />
                  </label>
                ) : (
                  <fieldset>
                    <legend className="text-[0.95rem] font-medium">
                      I am interested in
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {INTERESTS.map((t) => {
                        const on = picked.includes(t.value);
                        return (
                          <label
                            key={t.value}
                            className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-go-deep ${
                              on
                                ? "border-ink bg-ink text-white"
                                : "border-line bg-white hover:border-ink"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={on}
                              onChange={() =>
                                setPicked((v) =>
                                  on
                                    ? v.filter((x) => x !== t.value)
                                    : [...v, t.value],
                                )
                              }
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
                  <input
                    type="checkbox"
                    name="is_adult"
                    className="mt-1 h-5 w-5 shrink-0 accent-[#067a2e]"
                    {...bad("is_adult")}
                  />
                  <span>
                    {kind === "parent"
                      ? "I am 18 or older and the parent or guardian of the student."
                      : "I am 18 or older."}
                  </span>
                </label>
                <label className="flex items-start gap-3 text-[0.95rem]">
                  <input
                    type="checkbox"
                    name="consent_contact"
                    className="mt-1 h-5 w-5 shrink-0 accent-[#067a2e]"
                    {...bad("consent_contact")}
                  />
                  <span>
                    GRAAS may contact me by WhatsApp, phone or email about the
                    launch and my membership.{" "}
                    <Link
                      href="/privacy"
                      className="font-semibold underline decoration-go decoration-2 underline-offset-4"
                    >
                      How we use your details
                    </Link>
                  </span>
                </label>
                {err && (
                  <p
                    id="form-error"
                    role="alert"
                    className="rounded-xl border border-[#c2261a] bg-[#fff1ef] px-4 py-3 font-medium text-[#8f1a11]"
                  >
                    {err.error}
                  </p>
                )}
                <button
                  type="submit"
                  className="btn btn-primary justify-self-start"
                  disabled={busy}
                >
                  {busy
                    ? "Saving…"
                    : contact
                      ? "Send message"
                      : "Reserve my place"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
