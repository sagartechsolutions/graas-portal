"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { LANGUAGES, PLACES, SKILLS } from "@/lib/suggest";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/browser";
import ProfileView, { OPEN_TO, strength } from "./ProfileView";

/* The career profile builder (LinkedIn-style) and, for Industry and Institution members, the company page.
   Everything is saved in one go through member_profile_save, which cleans and limits every field. */

type Field = { k: string; label: string; ph?: string; wide?: boolean; area?: boolean; check?: string };
const LISTS: Record<string, { title: string; hint: string; add: string; fields: Field[] }> = {
  experience: {
    title: "Experience",
    hint: "Jobs, internships, apprenticeships, freelance or volunteer work. Newest first.",
    add: "Add experience",
    fields: [
      { k: "title", label: "Role", ph: "Automation intern" },
      { k: "org", label: "Company or organisation", ph: "ACME Controls" },
      { k: "kind", label: "Type", ph: "Internship, full time, part time…" },
      { k: "place", label: "Place", ph: "Nashik" },
      { k: "from", label: "From", ph: "Jun 2025" },
      { k: "to", label: "To", ph: "Aug 2025", check: "current" },
      { k: "summary", label: "What you did", ph: "Programmed a Siemens S7-1200 PLC for a packing line…", wide: true, area: true },
    ],
  },
  education: {
    title: "Education",
    hint: "Your current course first, then earlier ones.",
    add: "Add education",
    fields: [
      { k: "course", label: "Course", ph: "B.E. Mechanical Engineering" },
      { k: "institute", label: "College or school", ph: "Late G N Sapkal College of Engineering" },
      { k: "board", label: "University or board", ph: "SPPU" },
      { k: "from", label: "From", ph: "2023" },
      { k: "to", label: "To", ph: "2027" },
      { k: "score", label: "Score", ph: "8.2 CGPA or 86%" },
    ],
  },
  projects: {
    title: "Projects",
    hint: "Robots, automation builds, college projects, competition entries. Companies read these first.",
    add: "Add a project",
    fields: [
      { k: "title", label: "Project", ph: "Line-following robot with PID control" },
      { k: "role", label: "Your role", ph: "Team lead, control code" },
      { k: "year", label: "Year", ph: "2026" },
      { k: "tools", label: "Tools used", ph: "Arduino, ROS, SolidWorks" },
      { k: "link", label: "Link (GitHub, video, report)", ph: "https://github.com/…", wide: true },
      { k: "summary", label: "What it does and what you built", wide: true, area: true },
    ],
  },
  achievements: {
    title: "Achievements",
    hint: "Prizes, ranks, papers, scholarships, positions of responsibility.",
    add: "Add an achievement",
    fields: [
      { k: "title", label: "Achievement", ph: "Winner, state robotics competition" },
      { k: "year", label: "Year", ph: "2026" },
      { k: "detail", label: "Details", wide: true, area: true },
    ],
  },
  certifications: {
    title: "Certifications and courses",
    hint: "Courses and certificates outside GRAAS. GRAAS certificates appear automatically.",
    add: "Add a certification",
    fields: [
      { k: "name", label: "Name", ph: "PLC programming level 1" },
      { k: "issuer", label: "Issued by", ph: "Siemens, NPTEL, Coursera…" },
      { k: "year", label: "Year", ph: "2025" },
      { k: "link", label: "Link", ph: "https://…" },
    ],
  },
};
const LINKS: [string, string][] = [
  ["linkedin", "LinkedIn"],
  ["github", "GitHub"],
  ["portfolio", "Portfolio"],
  ["youtube", "YouTube"],
  ["website", "Website"],
];

export function Tags({ value, onChange, ph, max, suggest }: { value: string[]; onChange: (v: string[]) => void; ph: string; max: number; suggest?: string[] }) {
  const [t, setT] = useState("");
  const [more, setMore] = useState(false);
  const has = (x: string) => value.some((v) => v.toLowerCase() === x.toLowerCase());
  const q = t.trim().toLowerCase();
  const pool = (suggest ?? []).filter((x) => !has(x) && (!q || x.toLowerCase().includes(q)));
  const shown = more || q ? pool : pool.slice(0, 12);
  const add = () => {
    const parts = t.split(",").map((x) => x.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (!next.some((x) => x.toLowerCase() === p.toLowerCase()) && next.length < max) next.push(p.slice(0, 40));
    onChange(next);
    setT("");
  };
  return (
    <div className="rounded-2xl border border-line bg-white p-2.5 focus-within:border-ink">
      <ul className="flex flex-wrap gap-2">
        {value.map((s) => (
          <li key={s} className="inline-flex items-center gap-1.5 rounded-full bg-mist py-1 pl-3 pr-1.5 text-sm font-medium">
            {s}
            <button type="button" aria-label={`Remove ${s}`} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white" onClick={() => onChange(value.filter((x) => x !== s))}>
              ×
            </button>
          </li>
        ))}
        <li className="min-w-[12rem] flex-1">
          <input
            className="w-full bg-transparent px-2 py-1.5 outline-none"
            value={t}
            placeholder={value.length >= max ? `Up to ${max}` : ph}
            disabled={value.length >= max}
            onChange={(e) => setT(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                add();
              }
            }}
            onBlur={add}
          />
        </li>
      </ul>
      {pool.length > 0 && value.length < max && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line px-1 pt-2">
          <span className="mr-1 text-xs font-semibold text-ink2">{q ? "Matching:" : "Suggested:"}</span>
          {shown.map((x) => (
            <button
              key={x}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (value.length < max) onChange([...value, x]);
                setT("");
              }}
              className="rounded-full border border-dashed border-slate5 px-2.5 py-0.5 text-xs font-medium text-ink2 transition-colors hover:border-go hover:bg-go-soft hover:text-go-deep"
            >
              + {x}
            </button>
          ))}
          {!q && pool.length > 12 && (
            <button type="button" className="text-xs font-semibold underline underline-offset-2" onClick={() => setMore((v) => !v)}>
              {more ? "Fewer" : `${pool.length - 12} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ListEditor({ id, items, onChange }: { id: string; items: any[]; onChange: (v: any[]) => void }) {
  const d = LISTS[id];
  const set = (i: number, k: string, v: any) => onChange(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const move = (i: number, by: number) => {
    const n = [...items];
    const [x] = n.splice(i, 1);
    n.splice(i + by, 0, x);
    onChange(n);
  };
  return (
    <section className="card p-6 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="h-card">{d.title}</h3>
          <p className="text-sm text-ink2">{d.hint}</p>
        </div>
        <button type="button" className="btn btn-ghost !min-h-10" onClick={() => onChange([...items, {}])}>
          + {d.add}
        </button>
      </div>
      {items.length === 0 && <p className="mt-4 rounded-xl bg-mist px-4 py-3 text-sm text-ink2">Nothing added yet.</p>}
      <ol className="mt-4 grid gap-4">
        {items.map((x, i) => (
          <li key={i} className="rounded-2xl border border-line p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {d.fields.map((f) => (
                <label key={f.k} className={`grid gap-1 text-sm font-medium ${f.wide ? "sm:col-span-2" : ""}`}>
                  <span className="flex items-center justify-between gap-2">
                    {f.label}
                    {f.check && (
                      <span className="inline-flex items-center gap-1.5 font-normal text-ink2">
                        <input type="checkbox" className="h-4 w-4 accent-[#067a2e]" checked={!!x[f.check]} onChange={(e) => set(i, f.check!, e.target.checked)} />
                        Still here
                      </span>
                    )}
                  </span>
                  {f.area ? (
                    <textarea className="field min-h-24" maxLength={480} value={x[f.k] ?? ""} placeholder={f.ph} onChange={(e) => set(i, f.k, e.target.value)} />
                  ) : (
                    <input className="field" maxLength={120} value={x[f.k] ?? ""} placeholder={f.ph} disabled={!!(f.check && x[f.check])} onChange={(e) => set(i, f.k, e.target.value)} />
                  )}
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {i > 0 && (
                <button type="button" className="rounded-full px-3 py-1.5 font-semibold hover:bg-mist" onClick={() => move(i, -1)}>
                  Move up
                </button>
              )}
              {i < items.length - 1 && (
                <button type="button" className="rounded-full px-3 py-1.5 font-semibold hover:bg-mist" onClick={() => move(i, 1)}>
                  Move down
                </button>
              )}
              <button type="button" className="rounded-full px-3 py-1.5 font-semibold text-[#8f1a11] hover:bg-[#fff1ef]" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function CareerProfile({ a, goDetails }: { a: any; goDetails: () => void }) {
  const plan = a.membership?.plan;
  const org = plan?.audience === "institution" || plan?.audience === "industry";
  const school = plan?.code === "school-student";
  const [mp, setMp] = useState<any>(null);
  const [saved, setSaved] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [view, setView] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    browserClient()
      .rpc("my_profile")
      .then(({ data }) => {
        setMp(data ?? {});
        setSaved(JSON.stringify(data ?? {}));
      });
  }, []);
  if (!mp) return <div className="card p-8 text-ink2">Loading your profile…</div>;

  const set = (k: string, v: any) => setMp((x: any) => ({ ...x, [k]: v }));
  const dirty = JSON.stringify(mp) !== saved;
  const s = strength(a.profile, mp, org);

  async function save() {
    setBusy(true);
    setMsg(null);
    const keys = org
      ? ["org_about", "org_sector", "org_size", "org_website", "skills", "links"]
      : ["headline", "about", "skills", "languages", "experience", "education", "projects", "achievements", "certifications", "links", "open_to", "locations", "discoverable"];
    const body: any = {};
    for (const k of keys) body[k] = mp[k] ?? null;
    const { data, error } = await browserClient().rpc("member_profile_save", { p: body });
    setBusy(false);
    if (error || !data?.ok) return setMsg({ ok: false, text: data?.error ?? "Could not save. Please try again." });
    setMp(data.profile);
    setSaved(JSON.stringify(data.profile));
    setMsg({ ok: true, text: "Profile saved." });
  }

  const lists = school ? ["education", "projects", "achievements", "certifications"] : ["experience", "education", "projects", "achievements", "certifications"];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="h-card !text-2xl">{org ? "Company page" : "Career profile"}</h2>
            <p className="text-ink2">
              {org
                ? "What students and professionals see on your opportunities."
                : school
                  ? "Your projects and achievements, for competitions and your resume."
                  : "What companies see when you apply, and when GRAAS suggests you for a role. Your mobile number and email stay hidden until you accept."}
            </p>
          </div>
          <div className="inline-flex rounded-full bg-white p-1 shadow-[var(--shadow-card)]">
            {(["edit", "preview"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === v ? "bg-ink text-white" : "text-ink2"}`}>
                {v === "edit" ? "Edit" : "Preview"}
              </button>
            ))}
          </div>
        </div>

        {view === "preview" ? (
          <ProfileView p={a.profile} mp={mp} plan={plan} showContact={false} note={<p className="rounded-xl bg-mist px-4 py-3 text-sm text-ink2">This is how companies see you. Contact details appear only after you both accept.</p>} />
        ) : org ? (
          <section className="card grid gap-4 p-6 sm:p-7">
            <label className="grid gap-1.5 font-medium">
              About the organisation
              <textarea className="field min-h-40" maxLength={2600} value={mp.org_about ?? ""} onChange={(e) => set("org_about", e.target.value)} placeholder="What you make or teach, where you work, and what kind of people you look for." />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1.5 font-medium">
                Sector
                <input className="field" maxLength={80} value={mp.org_sector ?? ""} onChange={(e) => set("org_sector", e.target.value)} placeholder="Industrial automation" />
              </label>
              <label className="grid gap-1.5 font-medium">
                Size
                <select className="field" value={mp.org_size ?? ""} onChange={(e) => set("org_size", e.target.value)}>
                  <option value="">Choose</option>
                  {["1–10 people", "11–50 people", "51–200 people", "201–1,000 people", "1,000+ people"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 font-medium">
                Website
                <input className="field" maxLength={200} value={mp.org_website ?? ""} onChange={(e) => set("org_website", e.target.value)} placeholder="https://" />
              </label>
            </div>
            <div className="grid gap-1.5 font-medium">
              Focus areas
              <Tags value={mp.skills ?? []} onChange={(v) => set("skills", v)} ph="PLC, robotics, machine vision… (press Enter)" max={30} suggest={SKILLS} />
            </div>
          </section>
        ) : (
          <>
            <section className="card grid gap-4 p-6 sm:p-7">
              {!school && (
                <label className="grid gap-1.5 font-medium">
                  Headline
                  <input className="field" maxLength={160} value={mp.headline ?? ""} onChange={(e) => set("headline", e.target.value)} placeholder="Final-year Mechatronics student · PLC and ROS · Looking for automation internships" />
                  <span className="text-sm font-normal text-ink2">One line under your name. Say what you do and what you are looking for.</span>
                </label>
              )}
              <label className="grid gap-1.5 font-medium">
                About you
                <textarea className="field min-h-36" maxLength={2600} value={mp.about ?? ""} onChange={(e) => set("about", e.target.value)} placeholder="Three or four lines: what you are learning or working on, what you have built, and what you want to do next." />
              </label>
              <div className="grid gap-1.5 font-medium">
                {school ? "Interests and skills" : "Skills"}
                <Tags value={mp.skills ?? []} onChange={(v) => set("skills", v)} ph="PLC, Arduino, SolidWorks… (press Enter after each)" max={30} suggest={SKILLS} />
                <span className="text-sm font-normal text-ink2">GRAAS matches you to opportunities by these skills. Add at least five.</span>
              </div>
              {!school && (
                <>
                  <fieldset className="grid gap-2">
                    <legend className="font-medium">Open to</legend>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(OPEN_TO).map(([k, label]) => {
                        const on = (mp.open_to ?? []).includes(k);
                        return (
                          <button key={k} type="button" aria-pressed={on} onClick={() => set("open_to", on ? mp.open_to.filter((x: string) => x !== k) : [...(mp.open_to ?? []), k])} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink2 hover:border-ink"}`}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <div className="grid gap-1.5 font-medium">
                    Preferred places to work
                    <Tags value={mp.locations ?? []} onChange={(v) => set("locations", v)} ph="Nashik, Pune, Remote…" max={5} suggest={PLACES} />
                  </div>
                </>
              )}
            </section>
            {lists.map((id) => (
              <ListEditor key={id} id={id} items={mp[id] ?? []} onChange={(v) => set(id, v)} />
            ))}
            <section className="card grid gap-4 p-6 sm:p-7">
              <h3 className="h-card">Languages and links</h3>
              <div className="grid gap-1.5 font-medium">
                Languages
                <Tags value={mp.languages ?? []} onChange={(v) => set("languages", v)} ph="English, Marathi, Hindi…" max={10} suggest={LANGUAGES} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {LINKS.filter(([k]) => !school || k !== "linkedin").map(([k, label]) => (
                  <label key={k} className="grid gap-1.5 font-medium">
                    {label}
                    <input className="field" maxLength={200} value={mp.links?.[k] ?? ""} onChange={(e) => set("links", { ...(mp.links ?? {}), [k]: e.target.value })} placeholder="https://" />
                  </label>
                ))}
              </div>
            </section>
            {!school && (
              <label className="card flex items-start gap-3 p-5">
                <input type="checkbox" className="mt-1 h-5 w-5 accent-[#067a2e]" checked={mp.discoverable !== false} onChange={(e) => set("discoverable", e.target.checked)} />
                <span>
                  <b className="font-semibold">Let GRAAS suggest me to companies</b>
                  <span className="block text-sm text-ink2">
                    When a company posts a role that matches your skills, GRAAS may show your profile among its top 5 matches. Your mobile number and email are never shown until you accept the company.
                  </span>
                </span>
              </label>
            )}
          </>
        )}

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-[var(--shadow-lift)] backdrop-blur">
          <button type="button" className="btn btn-primary" disabled={busy || !dirty} onClick={save}>
            {busy ? "Saving…" : dirty ? "Save profile" : "Saved"}
          </button>
          {msg && <span className={`text-sm font-semibold ${msg.ok ? "text-go-deep" : "text-[#8f1a11]"}`}>{msg.text}</span>}
          {!msg && dirty && <span className="text-sm text-ink2">You have changes that are not saved yet.</span>}
        </div>
      </div>

      <aside className="side-lock grid content-start gap-4">
        <div className="card p-5">
          <p className="text-sm font-semibold text-ink2">Profile strength</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{s.pct}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-mist">
            <div className="h-full rounded-full bg-go transition-[width] duration-500" style={{ width: `${s.pct}%` }} />
          </div>
          {s.missing.length > 0 ? (
            <ul className="mt-4 grid gap-1.5 text-sm">
              {s.missing.map((x) => (
                <li key={x} className="flex items-center gap-2 text-ink2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-slate3" aria-hidden="true" /> {x}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-go-deep">Complete. Companies see a strong profile.</p>
          )}
        </div>
        <div className="card p-5 text-sm text-ink2">
          <p className="font-semibold text-ink">Name, photo, course and contact</p>
          <p className="mt-1">These come from your account details, so they match your member ID and certificates.</p>
          <button type="button" className="mt-3 font-semibold text-ink underline decoration-go decoration-2 underline-offset-4" onClick={goDetails}>
            Edit account details
          </button>
        </div>
      </aside>
    </div>
  );
}
