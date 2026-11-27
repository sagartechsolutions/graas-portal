"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { SKILLS } from "@/lib/suggest";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import HostEvents from "@/components/events/HostEvents";
import { Tags } from "@/components/member/CareerProfile";
import ChangePassword from "@/components/member/ChangePassword";
import { VerifyCard } from "@/components/member/Verify";
import { browserClient, portal, signOutAndReset } from "@/lib/browser";
import { inr } from "@/lib/money";

/* The Expert studio: industry leaders and trainers apply to host, then create sessions, see registrations,
   mark attendance, pay listing fees and follow their ticket-share earnings. */

const sb = () => browserClient();
const lbl = "grid gap-1.5 font-medium";

export function ExpertFields({ f, set, bad }: { f: any; set: (k: string, v: any) => void; bad: (k: string) => object }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={lbl}>
          Headline
          <input className="field" maxLength={160} value={f.headline ?? ""} onChange={(e) => set("headline", e.target.value)} placeholder="Designation, company name" {...bad("headline")} />
        </label>
        <label className={lbl}>
          Organisation
          <input className="field" maxLength={120} value={f.organisation ?? ""} onChange={(e) => set("organisation", e.target.value)} />
        </label>
        <label className={lbl}>
          Designation
          <input className="field" maxLength={120} value={f.designation ?? ""} onChange={(e) => set("designation", e.target.value)} />
        </label>
        <label className={lbl}>
          LinkedIn
          <input className="field" maxLength={200} value={f.linkedin ?? ""} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://linkedin.com/in/…" {...bad("linkedin")} />
        </label>
      </div>
      <label className={lbl}>
        About you
        <textarea className="field min-h-32" maxLength={2000} value={f.bio ?? ""} onChange={(e) => set("bio", e.target.value)} placeholder="Your experience, the plants or products you have worked on, and what you would like to teach." {...bad("bio")} />
      </label>
      <div className="grid gap-1.5 font-medium">
        Topics you can teach
        <Tags value={f.expertise ?? []} onChange={(v) => set("expertise", v)} ph="PLC, robot safety, machine vision… (press Enter)" max={12} suggest={SKILLS} />
      </div>
    </>
  );
}

function SignUp({ onDone }: { onDone: (email: string, verify: boolean) => void }) {
  const [f, setF] = useState<any>({ expertise: [] });
  const [err, setErr] = useState<{ field?: string; error: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const bad = (k: string) => (err?.field === k ? { "aria-invalid": true as const } : {});
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.password !== f.password2) return setErr({ field: "password2", error: "The two passwords do not match." });
    setBusy(true);
    setErr(null);
    const r = await portal("expert_signup", { ...f, accept: !!f.accept });
    if (!r.ok) {
      setBusy(false);
      return setErr({ field: r.field, error: r.error ?? "Could not create the account." });
    }
    await sb().auth.signInWithPassword({ email: String(f.email).trim().toLowerCase(), password: f.password });
    setBusy(false);
    onDone(String(f.email).trim().toLowerCase(), r.verify === "email");
  }
  return (
    <form onSubmit={submit} className="card grid gap-5 p-6 sm:p-8" noValidate>
      <div>
        <h2 className="h-card !text-2xl">Apply to host on GRAAS</h2>
        <p className="text-ink2">No membership needed. GRAAS checks your profile, usually within two working days.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={lbl}>
          Full name
          <input className="field" maxLength={80} value={f.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} autoComplete="name" {...bad("full_name")} />
        </label>
        <label className={lbl}>
          Email
          <input className="field" type="email" maxLength={160} value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} autoComplete="email" {...bad("email")} />
        </label>
        <label className={lbl}>
          Mobile number
          <input className="field" inputMode="numeric" maxLength={10} value={f.phone ?? ""} onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))} {...bad("phone")} />
        </label>
      </div>
      <ExpertFields f={f} set={set} bad={bad} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={lbl}>
          Password
          <input className="field" type="password" minLength={8} maxLength={72} value={f.password ?? ""} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" {...bad("password")} />
        </label>
        <label className={lbl}>
          Type it again
          <input className="field" type="password" maxLength={72} value={f.password2 ?? ""} onChange={(e) => set("password2", e.target.value)} autoComplete="new-password" {...bad("password2")} />
        </label>
      </div>
      <label className="flex items-start gap-3 text-[0.95rem]">
        <input type="checkbox" className="mt-1 h-5 w-5 accent-[#067a2e]" checked={!!f.accept} onChange={(e) => set("accept", e.target.checked)} {...bad("accept")} />
        <span>
          I accept the{" "}
          <Link href="/policies/terms" target="_blank" className="font-semibold underline">
            Terms of use
          </Link>{" "}
          and the{" "}
          <Link href="/policies/code-of-conduct" target="_blank" className="font-semibold underline">
            Code of conduct
          </Link>
          . I will not collect attendees&apos; contact details or payments outside GRAAS.
        </span>
      </label>
      {err && <p role="alert" className="rounded-xl border border-[#c2261a] bg-[#fff1ef] px-4 py-3 font-medium text-[#8f1a11]">{err.error}</p>}
      <button className="btn btn-primary justify-self-start" disabled={busy}>
        {busy ? "Creating…" : "Create account and apply"}
      </button>
      <p className="text-sm text-ink2">
        Already have a GRAAS login?{" "}
        <Link href="/signin?next=/studio" className="font-semibold underline">
          Sign in
        </Link>{" "}
        and apply from here.
      </p>
    </form>
  );
}

function Apply({ d, reload }: { d: any; reload: () => void }) {
  const x = d.expert ?? {};
  const [f, setF] = useState<any>({ full_name: x.full_name ?? d.profile?.full_name ?? "", headline: x.headline ?? "", bio: x.bio ?? "", expertise: x.expertise ?? [], organisation: x.organisation ?? d.profile?.organisation ?? "", designation: x.designation ?? d.profile?.designation ?? "", linkedin: x.linkedin ?? "" });
  const [err, setErr] = useState<{ field?: string; error: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((y: any) => ({ ...y, [k]: v }));
  const bad = (k: string) => (err?.field === k ? { "aria-invalid": true as const } : {});
  async function save() {
    setBusy(true);
    const { data } = await sb().rpc("expert_apply", { p: { ...f, update: true } });
    setBusy(false);
    if (!data?.ok) return setErr({ field: data?.field, error: data?.error ?? "Could not save." });
    reload();
  }
  return (
    <div className="card grid gap-5 p-6 sm:p-8">
      <div>
        <h2 className="h-card !text-2xl">{x.status === "approved" ? "Your expert profile" : "Apply to host on GRAAS"}</h2>
        <p className="text-ink2">Members see this on your sessions.</p>
      </div>
      <label className={lbl}>
        Full name
        <input className="field" maxLength={80} value={f.full_name} onChange={(e) => set("full_name", e.target.value)} {...bad("full_name")} />
      </label>
      <ExpertFields f={f} set={set} bad={bad} />
      {err && <p className="rounded-xl bg-[#fff1ef] px-4 py-3 font-medium text-[#8f1a11]">{err.error}</p>}
      <button type="button" className="btn btn-primary justify-self-start" disabled={busy} onClick={save}>
        {busy ? "Saving…" : x.status === "approved" ? "Save profile" : "Send application"}
      </button>
    </div>
  );
}

export default function StudioApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [d, setD] = useState<any>(null);
  const [verify, setVerify] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const load = useCallback(async () => {
    const { data } = await sb().rpc("my_expert");
    setD(data ?? {});
  }, []);
  useEffect(() => {
    sb()
      .auth.getSession()
      .then(({ data }) => setSession(data.session));
    const { data } = sb().auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (session) load();
  }, [session, load]);

  const head = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm text-ink2">Expert studio</p>
        <h1 className="h-section !text-[clamp(1.8rem,1.3rem+2vw,2.8rem)]">{d?.expert?.full_name ?? "Teach on GRAAS"}</h1>
      </div>
      {session && (
        <button type="button" className="btn btn-ghost !min-h-11" onClick={() => signOutAndReset("/studio")}>
          Sign out
        </button>
      )}
    </div>
  );
  if (session === undefined) return <div className="shell py-16 text-ink2">Loading…</div>;
  return (
    <section className="min-h-[70vh] bg-mist">
      <div className="shell grid gap-6 py-8 lg:py-9">
        {head}
        {!session ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <SignUp onDone={(email, v) => setVerify(v ? email : null)} />
            <aside className="card grid content-start gap-3 p-6">
              <p className="font-semibold">How hosting works</p>
              <ol className="grid gap-2 text-sm text-ink2">
                <li>1. Apply with your profile. GRAAS checks it.</li>
                <li>2. Create a session: webinar, live class, lecture or workshop.</li>
                <li>3. GRAAS approves it and confirms the fee model for paid sessions.</li>
                <li>4. Members register; you see the list and mark attendance.</li>
                <li>5. Attendees get GRAAS certificates; you get paid your share.</li>
              </ol>
              <Link href="/experts" className="font-semibold underline">
                Read more about hosting
              </Link>
            </aside>
          </div>
        ) : !d ? (
          <p className="text-ink2">Loading…</p>
        ) : (
          <>
            {verify && (
              <VerifyCard kind="email" target={verify} required onDone={() => setVerify(null)} />
            )}
            {!d.expert || d.expert.status === "rejected" || edit ? (
              <>
                {d.expert?.status === "rejected" && <p className="rounded-xl bg-[#fff1ef] px-4 py-3 text-[#8f1a11]"><b>GRAAS:</b> {d.expert.staff_note ?? "The application was not approved."} You can update it and apply again.</p>}
                <Apply d={d} reload={() => { setEdit(false); load(); }} />
              </>
            ) : d.expert.status === "pending" ? (
              <div className="card p-6 sm:p-8">
                <p className="chip">
                  <span className="dot" /> Application received
                </p>
                <h2 className="h-card mt-3 !text-2xl">GRAAS is checking your profile</h2>
                <p className="mt-2 text-ink2">You get an email as soon as you are approved, usually within two working days. Then you can create sessions here.</p>
                <button type="button" className="btn btn-ghost mt-5" onClick={() => setEdit(true)}>
                  Edit my application
                </button>
              </div>
            ) : d.expert.status === "paused" ? (
              <div className="card p-6 sm:p-8">
                <h2 className="h-card !text-2xl">Hosting is paused</h2>
                <p className="mt-2 text-ink2">{d.expert.staff_note ?? "GRAAS has paused your hosting for now. Write to connect@graas.org.in."}</p>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <HostEvents mode="expert" events={d.events ?? []} reload={load} />
                <aside className="grid content-start gap-4">
                  <div className="card p-5">
                    <p className="text-sm text-ink2">Ticket sales on GRAAS</p>
                    <p className="readout mt-1 text-3xl font-semibold">{inr((d.events ?? []).reduce((n: number, e: any) => n + Number(e.gross_paise ?? 0), 0))}</p>
                    <p className="mt-1 text-sm text-ink2">Your share is paid after each ticket-share session, by bank transfer or UPI.</p>
                  </div>
                  <div className="card p-5">
                    <p className="font-semibold">{d.expert.headline}</p>
                    <p className="mt-1 text-sm text-ink2">{(d.expert.expertise ?? []).join(" · ")}</p>
                    <button type="button" className="mt-3 text-sm font-semibold underline" onClick={() => setEdit(true)}>
                      Edit expert profile
                    </button>
                  </div>
                  <div className="card p-5">
                    <ChangePassword email={d.profile?.email} compact />
                  </div>
                </aside>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
