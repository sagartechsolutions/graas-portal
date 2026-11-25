"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import ChangePassword from "@/components/member/ChangePassword";
import { PledgeList, type PledgeText } from "@/components/member/Pledge";
import { browserClient } from "@/lib/browser";

const sb = () => browserClient();

/** The member pledge. A new version is saved each time; members keep the wording they signed. */
export function PledgeEditor() {
  const [cur, setCur] = useState<PledgeText | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", intro: "", points: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => {
    sb()
      .from("pledge_texts")
      .select("version,title,intro,points")
      .order("version", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const t = data?.[0] as PledgeText | undefined;
        if (!t) return;
        setCur(t);
        setForm({ title: t.title, intro: t.intro, points: t.points.join("\n") });
      });
    sb()
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("pledged_at", "is", null)
      .then(({ count }) => setCount(count ?? 0));
  };
  useEffect(load, []);
  const preview: PledgeText = { version: 0, title: form.title, intro: form.intro, points: form.points.split("\n").map((x) => x.trim()).filter(Boolean) };
  const changed = !!cur && (form.title !== cur.title || form.intro !== cur.intro || preview.points.join("\n") !== cur.points.join("\n"));
  async function save() {
    setBusy(true);
    const { data, error } = await sb().rpc("staff_set_pledge", { p_title: form.title, p_intro: form.intro, p_points: preview.points });
    setBusy(false);
    if (error || !data?.ok) return setMsg({ ok: false, text: data?.error ?? "Could not save." });
    setMsg({ ok: true, text: `Saved as version ${data.version}. New members sign this wording; earlier pledges keep theirs.` });
    load();
  }
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="plate grid gap-4 p-6">
        <p className="text-sm text-ink2">
          Version {cur?.version ?? "…"} in use{count !== null ? `, signed by ${count} ${count === 1 ? "member" : "members"} so far` : ""}. Members take the pledge when they sign up, at a chapter student&apos;s first sign-in, or from their account. Each pledge certificate prints the wording that member signed.
        </p>
        <label className="grid gap-1.5 font-medium">
          Title
          <input className="field" value={form.title} maxLength={80} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label className="grid gap-1.5 font-medium">
          Opening line
          <input className="field" value={form.intro} maxLength={300} onChange={(e) => setForm({ ...form, intro: e.target.value })} />
        </label>
        <label className="grid gap-1.5 font-medium">
          Pledge lines, one per line
          <textarea className="field min-h-64" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} />
          <span className="text-sm font-normal text-ink2">The first word of each line prints in bold. Up to 15 lines.</span>
        </label>
        {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-go-deep" : "text-[#8f1a11]"}`}>{msg.text}</p>}
        <button type="button" className="btn-go justify-self-start" disabled={busy || !changed} onClick={save}>
          {busy ? "Saving…" : "Save new version"}
        </button>
      </div>
      <div className="plate-soft p-6">
        <p className="text-sm font-semibold text-ink2">Preview</p>
        <h3 className="h-card mt-2">{preview.title}</h3>
        <p className="mt-2 font-medium">{preview.intro}</p>
        <PledgeList text={preview} className="mt-3" />
      </div>
    </div>
  );
}

/** Every staff login manages its own password here; staff logins have no member area. */
export function MyLogin({ email }: { email: string }) {
  return (
    <div className="grid gap-6">
      <div className="plate p-6">
        <ChangePassword email={email} />
      </div>
      <p className="max-w-2xl text-sm text-ink2">
        Staff logins belong to GRAAS, not to a person&apos;s membership. If you are also a member, use a separate personal login for My account. Your security PIN (for payment keys) is set under Payment gateway.
      </p>
    </div>
  );
}
