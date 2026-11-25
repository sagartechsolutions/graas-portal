"use client";

import { useEffect, useState } from "react";
import { browserClient } from "@/lib/browser";

/* The GRAAS member pledge. The wording lives in the database (pledge_texts) and is versioned, so a member's
   pledge certificate always shows the words they actually pledged, even after GRAAS changes the text. */

export type PledgeText = { version: number; title: string; intro: string; points: string[] };

export const PLEDGE_FALLBACK: PledgeText = {
  version: 1,
  title: "GRAAS Member Pledge",
  intro: "As a member of the Global Robotics And Automation Society, I pledge to:",
  points: [
    "Active participation in Robotics & Automation Awareness Programs, Technical Events, Online/Offline Sessions, Workshops, Conferences etc.",
    "Advance my knowledge and skills in robotics and automation technologies",
    "Promote innovation and excellence in my field of work and study",
    "Collaborate with peers and contribute to the community's collective growth",
    "Uphold ethical standards and professional conduct in all endeavors",
    "Mentor and support fellow members in their professional development",
    "Apply my knowledge to solve real-world problems and create positive impact",
  ],
};

/** The pledge text for a version (or the current one when no version is given). */
export function usePledge(version?: number | null) {
  const [text, setText] = useState<PledgeText | null>(null);
  useEffect(() => {
    let q = browserClient().from("pledge_texts").select("version,title,intro,points");
    q = version ? q.eq("version", version) : q.order("version", { ascending: false }).limit(1);
    q.then(({ data }) => setText(((data?.[0] as PledgeText) ?? PLEDGE_FALLBACK)));
  }, [version]);
  return text;
}

/** First word of each line in bold, as on the printed pledge. */
export function PledgeLine({ text }: { text: string }) {
  const [first, ...rest] = text.split(" ");
  return (
    <>
      <b className="font-semibold text-ink">{first}</b> {rest.join(" ")}
    </>
  );
}

export function PledgeList({ text, className = "" }: { text: PledgeText; className?: string }) {
  return (
    <ul className={`grid gap-2.5 ${className}`}>
      {text.points.map((p) => (
        <li key={p} className="flex gap-3 leading-snug">
          <span aria-hidden="true" className="mt-[0.45em] h-2 w-2 shrink-0 rotate-45 bg-go" />
          <span className="text-ink2">
            <PledgeLine text={p} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Shown on the sign-up form: the pledge with a tick box named "pledge". */
export function PledgeBox({ invalid }: { invalid?: boolean }) {
  const text = usePledge() ?? PLEDGE_FALLBACK;
  return (
    <div className={`rounded-[22px] border bg-white p-5 sm:p-6 ${invalid ? "border-[#c2261a]" : "border-line"}`}>
      <p className="text-sm font-semibold text-go-deep">Last step: the member pledge</p>
      <h3 className="h-card mt-1">{text.title}</h3>
      <p className="mt-2 font-medium">{text.intro}</p>
      <PledgeList text={text} className="mt-3" />
      <label className="mt-5 flex items-start gap-3 rounded-xl bg-go-soft px-4 py-3 text-[0.95rem] font-medium">
        <input type="checkbox" name="pledge" className="mt-1 h-5 w-5 shrink-0 accent-[#067a2e]" aria-invalid={invalid || undefined} />
        <span>I take the GRAAS member pledge. My pledge certificate is issued with my membership.</span>
      </label>
    </div>
  );
}

/** For members who joined before the pledge, or through a school: sign by typing your full name. */
export function TakePledge({ name, onDone }: { name: string; onDone: (msg: string) => void }) {
  const text = usePledge() ?? PLEDGE_FALLBACK;
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function sign(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { data, error } = await browserClient().rpc("member_take_pledge", { p_name: typed });
    setBusy(false);
    if (error || !data?.ok) return setErr(data?.error ?? "Could not save the pledge. Please try again.");
    onDone("Thank you. Your pledge is recorded and your pledge certificate is ready under Certificates.");
  }
  return (
    <div className="card overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[1.25fr_1fr]">
        <div className="p-6 sm:p-8">
          <p className="chip">
            <span className="dot" aria-hidden="true" /> Confirm your membership
          </p>
          <h2 className="h-card mt-3 !text-2xl">{text.title}</h2>
          <p className="mt-2 font-medium">{text.intro}</p>
          <PledgeList text={text} className="mt-4" />
        </div>
        <form onSubmit={sign} className="grid content-center gap-4 bg-mist p-6 sm:p-8">
          <p className="text-ink2">Every GRAAS member takes this pledge. Sign it by typing your full name as it appears in your profile.</p>
          <label className="grid gap-1.5 text-[0.95rem] font-medium">
            Your full name
            <input className="field" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={name} autoComplete="name" aria-invalid={!!err || undefined} />
          </label>
          {err && (
            <p role="alert" className="rounded-xl border border-[#c2261a] bg-[#fff1ef] px-4 py-3 text-sm font-medium text-[#8f1a11]">
              {err}
            </p>
          )}
          <button className="btn btn-primary justify-self-start" disabled={busy || typed.trim().length < 2}>
            {busy ? "Saving…" : "I take the pledge"}
          </button>
          <p className="text-sm text-ink2">You receive a pledge certificate that also confirms your membership.</p>
        </form>
      </div>
    </div>
  );
}
