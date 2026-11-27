"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import HostEvents from "@/components/events/HostEvents";
import ChangePassword from "@/components/member/ChangePassword";
import { Receipt } from "@/components/member/AccountApp";
import { ChapterCertificate } from "@/components/member/MemberDocs";
import Qr from "@/components/member/Qr";
import { VerifyCard } from "@/components/member/Verify";
import Icon, { IconTile } from "@/components/ui/Icon";
import { browserClient, portal, signOutAndReset } from "@/lib/browser";
import { INDIAN_STATES, inr, shortDate } from "@/lib/money";
import { readFileTable, rowsFromTable, type RosterRow } from "./sheet";

const sb = () => browserClient();
const lbl = "grid gap-1.5 text-[0.95rem] font-medium";
type D = { chapter: any | null; members: any[]; orders: any[]; settings: any; seat_quote: any; options: any; profile: any; email_on: boolean; pay_online: boolean; org: any; today: string };

function Note({ tone = "info", children }: { tone?: "info" | "good" | "warn" | "bad"; children: React.ReactNode }) {
  const cls = { info: "bg-mist text-ink", good: "bg-go-soft text-go-deep", warn: "bg-[#fff4e5] text-[#8a4b00]", bad: "bg-[#fff1ef] text-[#8f1a11]" }[tone];
  return <p role={tone === "bad" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-[0.95rem] font-medium ${cls}`}>{children}</p>;
}

const STATUS: Record<string, { label: string; tone: string }> = {
  draft: { label: "Not sent yet", tone: "bg-mist text-ink2" },
  submitted: { label: "With GRAAS for review", tone: "bg-[#fff4e5] text-[#8a4b00]" },
  approved: { label: "Approved", tone: "bg-go-soft text-go-deep" },
  rejected: { label: "Needs a change", tone: "bg-[#fff1ef] text-[#8f1a11]" },
  suspended: { label: "Suspended", tone: "bg-[#fff1ef] text-[#8f1a11]" },
};

function rowState(r: any, chapterStatus: string) {
  if (r.status === "pending") return chapterStatus === "draft" || chapterStatus === "rejected" ? { t: "On the list", c: "bg-mist text-ink2" } : { t: "Waiting for GRAAS", c: "bg-[#fff4e5] text-[#8a4b00]" };
  if (r.status === "awaiting_payment") return { t: "Needs payment", c: "bg-[#fff4e5] text-[#8a4b00]" };
  if (r.status === "ready" || r.status === "provisioning") return { t: "Login being set up", c: "bg-mist text-ink" };
  if (r.status === "rejected") return { t: "Not approved", c: "bg-[#fff1ef] text-[#8f1a11]" };
  if (r.status === "failed") return { t: "Could not create", c: "bg-[#fff1ef] text-[#8f1a11]" };
  if (r.status === "active") {
    if (r.membership_status === "pending_payment") return { t: "Login sent, fee due", c: "bg-[#fff4e5] text-[#8a4b00]" };
    if (r.signed_in) return { t: r.has_photo ? "Member, profile started" : "Member, signed in", c: "bg-go-soft text-go-deep" };
    if (r.login_sent_at) return { t: "Login sent", c: "bg-go-soft text-go-deep" };
    if (r.login_error) return { t: "Email not sent", c: "bg-[#fff1ef] text-[#8f1a11]" };
    return { t: "Login being sent", c: "bg-mist text-ink" };
  }
  return { t: r.status, c: "bg-mist text-ink2" };
}

/* ---------- Chapter details ---------- */

function DetailsForm({ d, kind, onSaved }: { d: D; kind: "college" | "school"; onSaved: (msg: string) => void }) {
  const c = d.chapter ?? {};
  const locked = c.status === "approved";
  const [k, setK] = useState<"college" | "school">(c.kind ?? kind);
  const [branch, setBranch] = useState<string>(c.branch ?? "");
  const [err, setErr] = useState<{ field?: string; error: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const bad = (f: string) => (err?.field === f ? { "aria-invalid": true as const } : {});
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    setErr(null);
    const { data, error } = await sb().rpc("chapter_save", { p: { ...f, kind: k } });
    setBusy(false);
    if (error || !data?.ok) return setErr({ field: data?.field, error: data?.error ?? "Could not save. Please try again." });
    onSaved("Chapter details saved.");
  }
  return (
    <form onSubmit={save} className="grid gap-5" noValidate>
      {!locked && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["college", "school"] as const).map((x) => (
            <label key={x} className={`card flex cursor-pointer items-center gap-3 p-4 ${k === x ? "!border-ink shadow-[var(--shadow-card)]" : ""}`}>
              <input type="radio" className="sr-only" checked={k === x} onChange={() => setK(x)} />
              <IconTile name={x === "college" ? "college" : "school"} tone={k === x ? "ink" : "mist"} size={20} />
              <span className="font-semibold">{x === "college" ? "College chapter (one branch)" : "School chapter"}</span>
            </label>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={`${lbl} sm:col-span-2`}>
          {k === "college" ? "Full name of the college" : "Full name of the school"}
          <input name="institution" className="field" defaultValue={c.institution ?? d.profile?.organisation ?? ""} maxLength={160} required readOnly={locked} {...bad("institution")} />
        </label>
        {k === "college" && (
          <>
            <label className={lbl}>
              Branch this chapter is for
              <select name="branch" className="field" value={branch} onChange={(e) => setBranch(e.target.value)} disabled={locked} {...bad("branch")}>
                <option value="" disabled>
                  Choose the branch
                </option>
                {(d.options?.branches ?? []).map((b: string) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
              {locked && <input type="hidden" name="branch" value={branch} />}
              {!locked && <span className="text-sm font-normal text-ink2">Branch not in the list? Choose &quot;Other&quot; and type its name. Every branch is welcome.</span>}
            </label>
            {branch === "Other" ? (
              <label className={lbl}>
                Name of the branch
                <input name="branch_other" className="field" defaultValue={c.branch_other ?? ""} maxLength={80} readOnly={locked} required placeholder="For example Textile, Mining, Aerospace" {...bad("branch_other")} />
              </label>
            ) : (
              <label className={lbl}>
                Your department
                <input name="head_department" className="field" defaultValue={c.head_department ?? ""} maxLength={80} placeholder="Usually the same branch" />
              </label>
            )}
          </>
        )}
        <label className={`${lbl} sm:col-span-2`}>
          <span>
            Address <span className="font-normal text-ink2">(optional)</span>
          </span>
          <input name="address" className="field" defaultValue={c.address ?? ""} maxLength={300} />
        </label>
        <label className={lbl}>
          City
          <input name="city" className="field" defaultValue={c.city ?? d.profile?.city ?? ""} maxLength={80} readOnly={locked} required {...bad("city")} />
        </label>
        <label className={lbl}>
          State
          <select name="state" className="field" defaultValue={c.state ?? d.profile?.state ?? "Maharashtra"} disabled={locked} {...bad("state")}>
            {INDIAN_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {locked && <input type="hidden" name="state" value={c.state ?? ""} />}
        </label>
        <label className={lbl}>
          <span>
            PIN code <span className="font-normal text-ink2">(optional)</span>
          </span>
          <input name="pincode" className="field" inputMode="numeric" defaultValue={c.pincode ?? ""} maxLength={6} {...bad("pincode")} />
        </label>
        <label className={lbl}>
          <span>
            Website <span className="font-normal text-ink2">(optional)</span>
          </span>
          <input name="website" className="field" defaultValue={c.website ?? ""} maxLength={160} />
        </label>
        <label className={lbl}>
          Principal&apos;s name
          <input name="principal_name" className="field" defaultValue={c.principal_name ?? ""} maxLength={80} placeholder="As on the letter" required {...bad("principal_name")} />
        </label>
        <label className={lbl}>
          Your designation
          <input name="head_designation" className="field" defaultValue={c.head_designation ?? d.profile?.designation ?? ""} maxLength={80} required {...bad("head_designation")} />
        </label>
        <label className={lbl}>
          Your mobile number
          <input name="head_phone" className="field" type="tel" inputMode="numeric" defaultValue={c.head_phone ?? d.profile?.phone ?? ""} maxLength={14} required {...bad("head_phone")} />
        </label>
        <div className={lbl}>
          Coordinator
          <p className="field flex items-center bg-mist">{d.profile?.full_name}, {d.profile?.email}</p>
        </div>
      </div>
      {err && <Note tone="bad">{err.error}</Note>}
      <button className="btn btn-primary justify-self-start" disabled={busy}>
        {busy ? "Saving…" : c.id ? "Save details" : "Save and continue"}
      </button>
    </form>
  );
}

/* ---------- Principal's letter ---------- */

function LetterBox({ d, onSaved }: { d: D; onSaved: (msg: string) => void }) {
  const c = d.chapter;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [link, setLink] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (!c?.letter_path) return;
    sb()
      .storage.from("chapter-docs")
      .createSignedUrl(c.letter_path, 600)
      .then(({ data }) => live && setLink(data?.signedUrl ?? null));
    return () => {
      live = false;
    };
  }, [c?.letter_path, c?.letter_uploaded_at]);
  async function upload(file: File) {
    setErr("");
    if (!/^(application\/pdf|image\/(jpeg|png))$/.test(file.type)) return setErr("Upload a PDF, JPG or PNG file.");
    if (file.size > 5 * 1024 * 1024) return setErr("The file is larger than 5 MB. Scan at a lower resolution or upload a photo.");
    setBusy(true);
    const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
    const path = `${c.id}/principal-letter-${Date.now()}.${ext}`;
    const up = await sb().storage.from("chapter-docs").upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) {
      setBusy(false);
      return setErr("The file could not be uploaded. Please try again.");
    }
    const { data } = await sb().rpc("chapter_set_letter", { p_path: path });
    setBusy(false);
    if (!data?.ok) return setErr(data?.error ?? "Could not save the letter.");
    onSaved("Principal's letter uploaded.");
  }
  const editable = c && ["draft", "rejected", "approved"].includes(c.status);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {c?.letter_path ? (
          <span className="flex items-center gap-2 rounded-xl bg-go-soft px-4 py-2.5 font-medium text-go-deep">
            <Icon name="check" size={18} strokeWidth={2.4} /> Uploaded {shortDate(c.letter_uploaded_at)}
            {link && (
              <a href={link} target="_blank" rel="noopener noreferrer" className="ml-2 underline underline-offset-4">
                View
              </a>
            )}
          </span>
        ) : (
          <span className="text-ink2">Not uploaded yet.</span>
        )}
      </div>
      {editable && (
        <label className="card flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed p-6 text-center transition-colors hover:border-ink">
          <Icon name="upload" size={28} />
          <span className="font-semibold">{busy ? "Uploading…" : c?.letter_path ? "Replace the letter" : "Upload the signed letter"}</span>
          <span className="text-sm text-ink2">PDF, JPG or PNG, up to 5 MB. A clear photo of the signed and stamped letter is fine.</span>
          <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      )}
      <p className="flex flex-wrap gap-x-5 gap-y-2 text-[0.95rem]">
        <Link href={`/chapters/letter?kind=${c?.kind ?? "college"}`} target="_blank" className="font-semibold underline decoration-go decoration-2 underline-offset-4">
          Fill in the letter template
        </Link>
        <a href={`/templates/graas-${c?.kind ?? "college"}-chapter-principal-letter.docx`} download className="font-semibold underline decoration-go decoration-2 underline-offset-4">
          Download it for Word
        </a>
      </p>
      {err && <Note tone="bad">{err}</Note>}
    </div>
  );
}

/* ---------- Adding students ---------- */

function OneStudent({ d, onAdded }: { d: D; onAdded: (msg: string) => void }) {
  const school = d.chapter.kind === "school";
  const courses = (d.options?.courses ?? []).filter((c: any) => (school ? /^school/i.test(c.name) : !/^school/i.test(c.name)));
  const [course, setCourse] = useState<string>(school ? (courses[0]?.name ?? "") : "");
  const [branch, setBranch] = useState("");
  const [err, setErr] = useState<{ field?: string; error: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [n, setN] = useState(0);
  const c = courses.find((x: any) => x.name === course);
  const bad = (f: string) => (err?.field === f ? { "aria-invalid": true as const } : {});
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const row = Object.fromEntries(new FormData(form).entries()) as RosterRow;
    setBusy(true);
    setErr(null);
    const { data, error } = await sb().rpc("chapter_add_members", { p_rows: [row], p_commit: true });
    setBusy(false);
    const r = data?.results?.[0];
    if (error || !data?.ok) return setErr({ error: data?.error ?? "Could not add the student." });
    if (!r?.ok) return setErr({ field: r?.field, error: r?.error ?? "Check the details." });
    form.reset();
    setN((x) => x + 1);
    setBranch("");
    if (!school) setCourse("");
    onAdded(`${row.full_name} added${r.seat === "paid" ? " (beyond the free seats)" : ""}.`);
  }
  return (
    <form key={n} onSubmit={add} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className={lbl}>
          Full name
          <input name="full_name" className="field" maxLength={80} required {...bad("full_name")} />
        </label>
        <label className={lbl}>
          Email {school && <span className="text-sm font-normal text-ink2">(student&apos;s or a parent&apos;s)</span>}
          <input name="email" type="email" className="field" maxLength={160} required {...bad("email")} />
        </label>
        <label className={lbl}>
          <span>
            Mobile {school && <span className="font-normal text-ink2">(optional)</span>}
          </span>
          <input name="phone" type="tel" inputMode="numeric" className="field" maxLength={14} {...bad("phone")} />
        </label>
        <label className={lbl}>
          Gender
          <select name="gender" className="field" defaultValue="" {...bad("gender")}>
            <option value="" disabled>
              Choose
            </option>
            {(d.options?.genders ?? []).map((g: string) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className={lbl}>
          Date of birth
          <input name="dob" type="date" className="field" {...bad("dob")} />
        </label>
        {!school && (
          <label className={lbl}>
            Course
            <select name="course" className="field" value={course} onChange={(e) => setCourse(e.target.value)} {...bad("course")}>
              <option value="" disabled>
                Choose the course
              </option>
              {courses.map((x: any) => (
                <option key={x.name}>{x.name}</option>
              ))}
            </select>
          </label>
        )}
        {!school && course === "Other" && (
          <label className={lbl}>
            Name of the course
            <input name="course_other" className="field" maxLength={80} {...bad("course_other")} />
          </label>
        )}
        <label className={lbl}>
          {school ? "Class" : "Year"}
          <select key={course} name="study_year" className="field" defaultValue="" disabled={!c} {...bad("study_year")}>
            <option value="" disabled>
              {c ? "Choose" : "Choose the course first"}
            </option>
            {(c?.years ?? []).map((y: string) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        {!school && c?.branches && (
          <label className={lbl}>
            Branch
            <select name="branch" className="field" value={branch} onChange={(e) => setBranch(e.target.value)} {...bad("branch")}>
              <option value="">Same as the chapter</option>
              {(d.options?.branches ?? []).map((b: string) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
        )}
        {!school && branch === "Other" && (
          <label className={lbl}>
            Name of the branch
            <input name="branch_other" className="field" maxLength={80} {...bad("branch_other")} />
          </label>
        )}
        <label className={lbl}>
          <span>
            Roll number <span className="font-normal text-ink2">(optional)</span>
          </span>
          <input name="roll_no" className="field" maxLength={40} />
        </label>
        <label className={lbl}>
          <span>
            Parent or guardian name {!school && <span className="font-normal text-ink2">(under 18)</span>}
          </span>
          <input name="guardian_name" className="field" maxLength={80} {...bad("guardian_name")} />
        </label>
        <label className={lbl}>
          <span>
            Parent or guardian mobile {!school && <span className="font-normal text-ink2">(under 18)</span>}
          </span>
          <input name="guardian_phone" type="tel" inputMode="numeric" className="field" maxLength={14} {...bad("guardian_phone")} />
        </label>
      </div>
      {err && <Note tone="bad">{err.error}</Note>}
      <button className="btn btn-primary justify-self-start" disabled={busy}>
        {busy ? "Adding…" : "Add this student"}
      </button>
    </form>
  );
}

function FromFile({ d, onAdded }: { d: D; onAdded: (msg: string) => void }) {
  const school = d.chapter.kind === "school";
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [check, setCheck] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [file, setFile] = useState("");
  async function pick(f: File) {
    setErr("");
    setCheck(null);
    setRows([]);
    setFile(f.name);
    if (f.size > 4 * 1024 * 1024) return setErr("The file is larger than 4 MB. Keep it to the student list only.");
    setBusy(true);
    try {
      const table = await readFileTable(f);
      const r = rowsFromTable(table, school, d.options);
      if (r.error) {
        setBusy(false);
        return setErr(r.error);
      }
      if (r.rows.length > 500) {
        setBusy(false);
        return setErr(`The file has ${r.rows.length} students. Upload up to 500 at a time.`);
      }
      setRows(r.rows);
      const { data } = await sb().rpc("chapter_add_members", { p_rows: r.rows, p_commit: false });
      if (!data?.ok) setErr(data?.error ?? "Could not check the list.");
      else setCheck(data);
    } catch {
      setErr("That file could not be read. Save it as .xlsx or .csv and try again.");
    }
    setBusy(false);
  }
  const good = useMemo(() => (check?.results ?? []).filter((x: any) => x.ok).map((x: any) => rows[x.row - 1]), [check, rows]);
  async function commit() {
    setBusy(true);
    const { data } = await sb().rpc("chapter_add_members", { p_rows: good, p_commit: true });
    setBusy(false);
    if (!data?.ok) return setErr(data?.error ?? "Could not add the students.");
    setRows([]);
    setCheck(null);
    setFile("");
    onAdded(`${data.valid} students added${data.paid ? `, ${data.paid} of them beyond the free seats` : ""}.`);
  }
  const FIELD: Record<string, string> = { full_name: "Name", email: "Email", phone: "Mobile", gender: "Gender", dob: "Date of birth", course: "Course", course_other: "Course", study_year: school ? "Class" : "Year", branch: "Branch", branch_other: "Branch", guardian_name: "Parent", guardian_phone: "Parent's mobile" };
  return (
    <div className="grid gap-4">
      <label className="card flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed p-7 text-center transition-colors hover:border-ink">
        <Icon name="upload" size={30} />
        <span className="text-lg font-semibold">{busy ? "Reading and checking…" : file ? `Choose another file (now: ${file})` : "Upload the Excel or CSV student list"}</span>
        <span className="text-sm text-ink2">Every row is checked before anything is added. Nothing is added until you confirm.</span>
        <input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="sr-only" disabled={busy} onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
      </label>
      <p className="text-sm">
        <a href={`/templates/graas-${d.chapter.kind}-chapter-students.xlsx`} download className="font-semibold underline decoration-go decoration-2 underline-offset-4">
          Download the {school ? "school" : "college"} student list template
        </a>
        <span className="text-ink2">. Pick-lists for {school ? "gender and class" : "gender, course, year and branch"} are built in.</span>
      </p>
      {err && <Note tone="bad">{err}</Note>}
      {check && (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-3">
            <span className="rounded-xl bg-go-soft px-4 py-2.5 font-semibold text-go-deep">{check.valid} ready to add</span>
            {check.invalid > 0 && <span className="rounded-xl bg-[#fff1ef] px-4 py-2.5 font-semibold text-[#8f1a11]">{check.invalid} need a fix</span>}
            {d.chapter.kind === "college" && check.paid > 0 && <span className="rounded-xl bg-[#fff4e5] px-4 py-2.5 font-semibold text-[#8a4b00]">{check.paid} beyond the free seats</span>}
          </div>
          <div className="max-h-[26rem] overflow-auto rounded-2xl border border-line">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 bg-mist text-left">
                <tr>
                  <th className="p-3">Row</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">{school ? "Class" : "Course and year"}</th>
                  <th className="p-3">Check</th>
                </tr>
              </thead>
              <tbody>
                {check.results.map((x: any) => {
                  const r = rows[x.row - 1] ?? {};
                  return (
                    <tr key={x.row} className={`border-t border-line ${x.ok ? "" : "bg-[#fff8f7]"}`}>
                      <td className="readout p-3 text-ink2">{x.row}</td>
                      <td className="p-3">
                        <span className="block font-medium">{r.full_name || "(no name)"}</span>
                        <span className="text-ink2">{r.email}</span>
                      </td>
                      <td className="p-3 text-ink2">{school ? r.study_year : [r.course, r.study_year].filter(Boolean).join(", ")}</td>
                      <td className="p-3">
                        {x.ok ? (
                          <span className="font-semibold text-go-deep">{x.seat === "paid" ? "OK, beyond free seats" : "OK"}</span>
                        ) : (
                          <span className="font-medium text-[#8f1a11]">
                            {FIELD[x.field] ? `${FIELD[x.field]}: ` : ""}
                            {x.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary" disabled={busy || good.length === 0} onClick={commit}>
              {busy ? "Adding…" : `Add ${good.length} ${good.length === 1 ? "student" : "students"}`}
            </button>
            {check.invalid > 0 && <span className="text-sm text-ink2">Rows that need a fix are left out. Correct them in the file and upload it again; rows already added are recognised.</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function AddStudents({ d, onAdded }: { d: D; onAdded: (msg: string) => void }) {
  const [mode, setMode] = useState<"file" | "one">("file");
  return (
    <div className="grid gap-5">
      <div className="inline-flex w-fit gap-1 rounded-full bg-mist p-1">
        {(
          [
            ["file", "Upload Excel or CSV"],
            ["one", "Type in one student"],
          ] as const
        ).map(([k, t]) => (
          <button key={k} type="button" onClick={() => setMode(k)} className={`rounded-full px-4 py-2 text-[0.95rem] font-semibold transition-colors ${mode === k ? "bg-ink text-white" : "text-ink2 hover:text-ink"}`}>
            {t}
          </button>
        ))}
      </div>
      {mode === "file" ? <FromFile d={d} onAdded={onAdded} /> : <OneStudent d={d} onAdded={onAdded} />}
    </div>
  );
}

/* ---------- Student list ---------- */

function Roster({ d, reload }: { d: D; reload: (msg?: string) => void }) {
  const c = d.chapter;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const list = d.members.filter((r) => r.status !== "removed");
  const shown = list.filter((r) => {
    const s = rowState(r, c.status).t;
    const match = !q || `${r.full_name} ${r.email} ${r.member_no ?? ""} ${r.roll_no ?? ""}`.toLowerCase().includes(q.toLowerCase());
    const f = filter === "all" || (filter === "members" && r.status === "active") || (filter === "waiting" && ["pending", "ready", "provisioning"].includes(r.status)) || (filter === "pay" && r.status === "awaiting_payment") || (filter === "problem" && ["failed", "rejected"].includes(r.status)) || (filter === "notsigned" && r.status === "active" && !r.signed_in);
    return match && f && s;
  });
  async function remove(id: string) {
    setBusy(id);
    const { data } = await sb().rpc("chapter_remove_member", { p_id: id });
    setBusy(null);
    if (!data?.ok) return setMsg({ tone: "bad", text: data?.error ?? "Could not remove." });
    reload("Taken off the list.");
  }
  async function resend(id: string) {
    setBusy(id);
    const r = await portal("chapter_resend", { row_id: id });
    setBusy(null);
    setMsg(r.ok ? { tone: "good", text: `A new first password was emailed to ${r.sent_to}.` } : { tone: "bad", text: r.error ?? "Could not send." });
    if (r.ok) reload();
  }
  function csv() {
    const rows = [["Name", "Email", "Mobile", d.chapter.kind === "school" ? "Class" : "Course", "Year", "Branch", "Roll number", "Seat", "Status", "Member number"]];
    for (const r of list)
      rows.push([r.full_name, r.email, r.phone ?? "", r.course ?? "", r.study_year ?? "", r.branch === "Other" ? r.branch_other ?? "" : r.branch ?? "", r.roll_no ?? "", r.seat, rowState(r, c.status).t, r.member_no ?? ""]);
    const text = rows.map((r) => r.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv" }));
    a.download = `graas-chapter-students-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }
  if (list.length === 0) return <p className="text-ink2">No students on the list yet.</p>;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input className="field !min-h-11 max-w-xs" placeholder="Search name, email or number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search students" />
        <select className="field !min-h-11 w-auto" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Show">
          <option value="all">Everyone ({list.length})</option>
          <option value="members">Members</option>
          <option value="notsigned">Not signed in yet</option>
          <option value="waiting">Waiting</option>
          <option value="pay">Needs payment</option>
          <option value="problem">Not approved or failed</option>
        </select>
        <button type="button" className="btn btn-ghost !min-h-11" onClick={csv}>
          Download list (CSV)
        </button>
      </div>
      {msg && <Note tone={msg.tone}>{msg.text}</Note>}
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[760px] text-[0.93rem]">
          <thead className="bg-mist text-left">
            <tr>
              <th className="p-3">Student</th>
              <th className="p-3">{c.kind === "school" ? "Class" : "Course"}</th>
              <th className="p-3">Seat</th>
              <th className="p-3">Status</th>
              <th className="p-3">Member number</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const st = rowState(r, c.status);
              return (
                <tr key={r.id} className="border-t border-line align-top">
                  <td className="p-3">
                    <span className="block font-medium">{r.full_name}</span>
                    <span className="text-ink2">{r.email}</span>
                  </td>
                  <td className="p-3 text-ink2">{c.kind === "school" ? r.study_year : [r.course === "Other" ? r.course_other : r.course, r.study_year].filter(Boolean).join(", ")}</td>
                  <td className="p-3">{r.seat === "free" ? "Free" : r.seat === "paid" ? "Paid by chapter" : "Student pays"}</td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.c}`}>{st.t}</span>
                    {(r.reason || (r.login_error && r.status !== "active") || (r.status === "active" && r.login_error)) && <span className="mt-1 block text-xs text-[#8f1a11]">{r.reason ?? r.login_error}</span>}
                  </td>
                  <td className="readout p-3">{r.member_no ?? "—"}</td>
                  <td className="p-3 text-right">
                    {["pending", "awaiting_payment", "failed"].includes(r.status) && c.status !== "submitted" && (
                      <button type="button" className="text-sm font-semibold text-[#8f1a11] underline underline-offset-4" disabled={busy === r.id} onClick={() => remove(r.id)}>
                        Remove
                      </button>
                    )}
                    {r.status === "active" && !r.signed_in && (
                      <button type="button" className="text-sm font-semibold underline decoration-go decoration-2 underline-offset-4" disabled={busy === r.id} onClick={() => resend(r.id)}>
                        {busy === r.id ? "Sending…" : "Send login again"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Paying for students beyond the free seats ---------- */

function loadRazorpay(): Promise<boolean> {
  return new Promise((res) => {
    if ((window as any).Razorpay) return res(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => res(true);
    s.onerror = () => res(false);
    document.body.appendChild(s);
  });
}

function PayExtra({ d, reload }: { d: D; reload: (msg?: string) => void }) {
  const waiting = d.members.filter((r) => r.status === "awaiting_payment");
  const [picked, setPicked] = useState<string[]>(() => waiting.map((r) => r.id));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const each = d.seat_quote?.ok ? Number(d.seat_quote.total_paise) : null;
  if (waiting.length === 0) return null;
  const sel = waiting.filter((r) => picked.includes(r.id));
  async function pay() {
    setBusy(true);
    setMsg("");
    const o = await portal("create_order", { purpose: "chapter", ids: sel.map((r) => r.id) });
    if (!o.ok) {
      setBusy(false);
      return setMsg(o.error ?? "Could not start the payment.");
    }
    if (o.free) return reload("Done. Logins are being sent.");
    if (!(await loadRazorpay())) {
      setBusy(false);
      return setMsg("The payment window could not load. Check your internet and try again.");
    }
    const rz = new (window as any).Razorpay({
      key: o.key_id,
      order_id: o.rzp_order_id,
      amount: o.amount,
      currency: "INR",
      name: "GRAAS",
      description: String(o.description ?? "GRAAS chapter seats"),
      prefill: o.prefill,
      theme: { color: "#000e21" },
      modal: { ondismiss: () => setBusy(false) },
      handler: async (r: any) => {
        setMsg("Confirming the payment and setting up logins…");
        const v = await portal("verify_payment", { rzp_order_id: r.razorpay_order_id, rzp_payment_id: r.razorpay_payment_id, signature: r.razorpay_signature });
        setBusy(false);
        reload(v.ok ? "Payment received. Thank you. The students' logins are being emailed." : v.error);
      },
    });
    rz.on("payment.failed", () => setMsg("The payment did not go through. Nothing was charged, or it will be reversed by your bank."));
    rz.open();
  }
  async function selfPay() {
    setBusy(true);
    const { data } = await sb().rpc("chapter_self_pay", { p_ids: sel.map((r) => r.id) });
    if (!data?.ok) {
      setBusy(false);
      return setMsg(data?.error ?? "Could not do this.");
    }
    await portal("chapter_provision", { chapter_id: d.chapter.id });
    setBusy(false);
    reload(`${data.count} students will get their login and pay from their own account.`);
  }
  return (
    <div className="card grid gap-4 border-[#f3d7a6] bg-[#fffaf0] p-5 sm:p-7">
      <div>
        <h3 className="h-card">Students beyond the free seats</h3>
        <p className="mt-1 text-ink2">
          {waiting.length} {waiting.length === 1 ? "student needs" : "students need"} a paid seat at {each !== null ? inr(each) : "the Student fee"} each, for one year. Pay for them now in one payment, or let each student pay from their own account.
        </p>
      </div>
      <div className="max-h-60 overflow-auto rounded-xl border border-line bg-white">
        <label className="flex items-center gap-3 border-b border-line px-4 py-2.5 font-semibold">
          <input type="checkbox" className="h-4 w-4 accent-[#067a2e]" checked={sel.length === waiting.length} onChange={(e) => setPicked(e.target.checked ? waiting.map((r) => r.id) : [])} />
          Everyone ({waiting.length})
        </label>
        {waiting.map((r) => (
          <label key={r.id} className="flex items-center gap-3 px-4 py-2 text-[0.95rem]">
            <input type="checkbox" className="h-4 w-4 accent-[#067a2e]" checked={picked.includes(r.id)} onChange={(e) => setPicked((x) => (e.target.checked ? [...x, r.id] : x.filter((y) => y !== r.id)))} />
            {r.full_name} <span className="text-ink2">{r.email}</span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {d.pay_online ? (
          <button type="button" className="btn btn-primary" disabled={busy || sel.length === 0} onClick={pay}>
            {busy ? "Working…" : `Pay ${each !== null ? inr(each * sel.length) : ""} for ${sel.length} ${sel.length === 1 ? "student" : "students"}`}
          </button>
        ) : (
          <Note tone="warn">Online payment opens shortly.</Note>
        )}
        <button type="button" className="btn btn-ghost" disabled={busy || sel.length === 0} onClick={selfPay}>
          Let them pay themselves
        </button>
      </div>
      {msg && <Note tone="warn">{msg}</Note>}
    </div>
  );
}

/* ---------- The console ---------- */

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-ink2">{label}</p>
      <p className="readout mt-1 text-3xl font-medium tracking-tight">{value}</p>
      {note && <p className="mt-1 text-sm text-ink2">{note}</p>}
    </div>
  );
}

function StepCard({ n, title, done, children, open = true }: { n: number; title: string; done: boolean; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="card group overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
        <span className={`readout flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${done ? "bg-go text-white" : "bg-ink text-white"}`}>{done ? <Icon name="check" size={16} strokeWidth={2.6} /> : n}</span>
        <span className="flex-1 text-lg font-semibold">{title}</span>
        <span className="text-sm font-semibold text-ink2 group-open:hidden">Open</span>
      </summary>
      <div className="border-t border-line p-5 sm:p-6">{children}</div>
    </details>
  );
}

export default function ChapterApp() {
  const params = useSearchParams();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [d, setD] = useState<D | null>(null);
  const [flash, setFlash] = useState("");
  const [tab, setTab] = useState("overview");
  const [submitErr, setSubmitErr] = useState("");
  const [sending, setSending] = useState(false);
  // A chapter login created or handed over by GRAAS starts with a first password from the email.
  const [mustChange, setMustChange] = useState(false);
  useEffect(() => {
    if (!session) return;
    sb()
      .from("profiles")
      .select("must_change_password")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setMustChange(!!data?.must_change_password));
  }, [session]);

  const load = useCallback(async () => {
    const { data } = await sb().rpc("my_chapter");
    setD((data as D) ?? null);
  }, []);
  useEffect(() => {
    sb()
      .auth.getSession()
      .then(({ data }) => setSession(data.session));
    const { data } = sb().auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (session) Promise.resolve().then(load);
  }, [session, load]);
  const reload = (msg?: string) => {
    if (msg) setFlash(msg);
    load();
  };
  // While logins are being set up, look again every few seconds.
  const settingUp = !!d?.members.some((r) => r.status === "ready" || r.status === "provisioning");
  useEffect(() => {
    if (!settingUp) return;
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, [settingUp, load]);

  if (session === undefined) return <div className="shell py-16 text-ink2">Loading…</div>;
  if (session === null)
    return (
      <section className="bg-mist">
        <div className="mx-auto w-full max-w-xl px-5 py-14">
          <h1 className="h-section">Chapter console</h1>
          <p className="lede mt-3">For chapter coordinators. Sign in with your coordinator account, or start a new chapter.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/signin?next=/chapter" className="btn btn-primary">
              Sign in
            </Link>
            <Link href="/chapters/apply" className="btn btn-ghost">
              Start a chapter
            </Link>
          </div>
        </div>
      </section>
    );
  if (!d) return <div className="shell py-16 text-ink2">Loading your chapter…</div>;
  if (mustChange) return <CoordinatorFirstPassword done={() => { setMustChange(false); reload("Your password is set. Welcome to the chapter console."); }} />;

  const c = d.chapter;
  const kind: "college" | "school" = c?.kind ?? (params.get("kind") === "school" ? "school" : "college");
  const listed = d.members.filter((r) => !["removed", "rejected"].includes(r.status));
  const pendingCount = d.members.filter((r) => r.status === "pending").length;
  const min = c?.min_members ?? d.settings?.min_members ?? 10;
  const freeUsed = d.members.filter((r) => r.seat === "free" && !["removed", "rejected", "failed"].includes(r.status)).length;
  const needEmail = d.email_on && !d.profile?.email_verified;

  async function submit() {
    setSubmitErr("");
    setSending(true);
    const { data } = await sb().rpc("chapter_submit");
    setSending(false);
    if (!data?.ok) return setSubmitErr(data?.error ?? "Could not send the application.");
    reload("Your application has been sent to GRAAS. We will email you when it is approved.");
  }
  async function sendNow() {
    setSending(true);
    const r = await portal("chapter_provision", { chapter_id: c.id });
    setSending(false);
    reload(r.ok ? `${r.made ?? 0} logins set up${r.left ? `, ${r.left} still in progress` : ""}.` : r.error);
  }

  const head = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm text-ink2">Chapter console</p>
        <h1 className="h-section !text-[clamp(1.7rem,1.25rem+1.8vw,2.6rem)]">{c ? c.label : `Set up your ${kind} chapter`}</h1>
        {c && (
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS[c.status]?.tone}`}>{STATUS[c.status]?.label}</span>
            {c.code && <span className="readout rounded-full bg-white px-3 py-1 text-sm shadow-[var(--shadow-card)]">{c.code}</span>}
            {c.valid_until && <span className="text-sm text-ink2">Valid until {shortDate(c.valid_until)}</span>}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost !min-h-11" onClick={() => signOutAndReset("/")}>
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <section className="min-h-[70vh] bg-mist">
      <div className="shell grid gap-6 py-8 lg:py-9">
        <div className="print:hidden">{head}</div>
        {flash && (
          <div className="print:hidden">
            <Note tone="good">{flash}</Note>
          </div>
        )}
        {needEmail && (
          <div className="print:hidden">
            <VerifyCard kind="email" target={d.profile.email} required onDone={() => reload("Your email is confirmed.")} />
          </div>
        )}

        {/* Setting up, or fixing what GRAAS asked for */}
        {(!c || c.status === "draft" || c.status === "rejected") && (
          <div className="grid gap-4">
            {c?.status === "rejected" && <Note tone="bad">GRAAS asked for a change: {c.decision_reason}. Make the change below and send the application again.</Note>}
            <StepCard n={1} title="Chapter and coordinator details" done={!!c} open={!c}>
              <DetailsForm d={d} kind={kind} onSaved={(m) => reload(m)} />
            </StepCard>
            {c && (
              <>
                <StepCard n={2} title="The principal's letter" done={!!c.letter_path} open={!c.letter_path}>
                  <LetterBox d={d} onSaved={(m) => reload(m)} />
                </StepCard>
                <StepCard n={3} title={`Students: ${listed.length} on the list${c.kind === "college" ? `, at least ${min} needed` : ""}`} done={listed.length >= (c.kind === "college" ? min : 1)} open>
                  <div className="grid gap-6">
                    {c.kind === "college" && (
                      <p className="text-[0.95rem] text-ink2">
                        The first {c.free_seats ?? d.settings?.free_seats} students are free ({Math.max(0, (c.free_seats ?? 15) - freeUsed)} free seats left). More students can join at the Student fee once the chapter is approved.
                      </p>
                    )}
                    <AddStudents d={d} onAdded={(m) => reload(m)} />
                    <Roster d={d} reload={reload} />
                  </div>
                </StepCard>
                <StepCard n={4} title="Send to GRAAS" done={false}>
                  <div className="grid gap-4">
                    <ul className="grid gap-2">
                      {[
                        ["Chapter details saved", true],
                        ["Principal's letter uploaded", !!c.letter_path],
                        [c.kind === "college" ? `At least ${min} students on the list (${pendingCount} now)` : `Students on the list (${pendingCount} now)`, c.kind === "college" ? pendingCount >= min : pendingCount >= Math.min(min, 1)],
                        ["Your email confirmed", !needEmail],
                      ].map(([t, ok]) => (
                        <li key={String(t)} className="flex items-center gap-3">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${ok ? "bg-go text-white" : "border-2 border-slate3"}`}>{ok ? <Icon name="check" size={14} strokeWidth={2.8} /> : null}</span>
                          <span className={ok ? "" : "text-ink2"}>{String(t)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[0.95rem] text-ink2">GRAAS checks the letter and every student, usually within a few working days. You cannot add students while the application is being reviewed.</p>
                    {submitErr && <Note tone="bad">{submitErr}</Note>}
                    <button type="button" className="btn btn-primary justify-self-start" disabled={sending} onClick={submit}>
                      {sending ? "Sending…" : "Send the application to GRAAS"}
                    </button>
                  </div>
                </StepCard>
              </>
            )}
          </div>
        )}

        {c?.status === "submitted" && (
          <div className="grid gap-5">
            <div className="card flex flex-wrap items-center gap-5 p-6 sm:p-8">
              <IconTile name="clock" tone="green" />
              <div className="flex-1">
                <h2 className="h-card">Your application is with GRAAS.</h2>
                <p className="mt-1 text-ink2">
                  Sent on {shortDate(c.submitted_at)} with {pendingCount} students. We check the letter and the students, then approve the chapter. Every approved student gets their own login by email.
                </p>
              </div>
            </div>
            <div className="card p-6 sm:p-8">
              <h2 className="h-card mb-4">Students on the list</h2>
              <Roster d={d} reload={reload} />
            </div>
          </div>
        )}

        {c?.status === "suspended" && <Note tone="bad">This chapter is suspended. {c.decision_reason ? `Reason: ${c.decision_reason}. ` : ""}Please write to connect@graas.org.in.</Note>}

        {c && (c.status === "approved" || c.status === "suspended") && (
          <>
            <div role="tablist" className="sticky top-[5rem] z-20 flex gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-[var(--shadow-card)] print:hidden sm:w-fit">
              {[
                ["overview", "Overview"],
                ["students", "Students"],
                ["add", "Add students"],
                ["events", "Events"],
                ["certificate", "Certificate"],
                ["details", "Details and letter"],
              ].map(([id, t]) => (
                <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-[0.95rem] font-semibold transition-colors ${tab === id ? "bg-ink text-white" : "text-ink2 hover:text-ink"}`}>
                  {t}
                </button>
              ))}
            </div>
            {tab === "overview" && (
              <div className="grid gap-5">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Stat label="Members" value={d.members.filter((r) => r.status === "active").length} note={`${listed.length} on the list`} />
                  <Stat label="Signed in" value={d.members.filter((r) => r.status === "active" && r.signed_in).length} note="Chose their own password" />
                  <Stat label="Waiting for GRAAS" value={pendingCount} note="Approval pending" />
                  <Stat label={c.kind === "college" ? "Free seats left" : "Cost to the school"} value={c.kind === "college" ? Math.max(0, (c.free_seats ?? 15) - freeUsed) : "₹0"} note={c.kind === "college" ? `of ${c.free_seats ?? 15}` : "Every student is free"} />
                </div>
                {settingUp && (
                  <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
                    <p className="flex items-center gap-3">
                      <span className="dot dot-live" /> Logins are being set up and emailed. This page refreshes by itself.
                    </p>
                    <button type="button" className="btn btn-ghost !min-h-11" disabled={sending} onClick={sendNow}>
                      {sending ? "Working…" : "Send them now"}
                    </button>
                  </div>
                )}
                <PayExtra d={d} reload={reload} />
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    ["add", "upload", "Add more students", c.kind === "college" ? "Excel or one by one. Free seats first, then the Student fee." : "Excel or one by one. GRAAS approves each student."],
                    ["students", "people", "Follow every student", "Who has signed in, who still needs to, and member numbers."],
                    ["certificate", "certificate", "Print the chapter certificate", "A4 landscape, with the chapter number and a QR code."],
                  ].map(([id, icon, t, s]) => (
                    <button key={id} type="button" onClick={() => setTab(id)} className="card card-lift flex items-start gap-4 p-5 text-left">
                      <IconTile name={icon} />
                      <span>
                        <span className="block font-semibold">{t}</span>
                        <span className="mt-0.5 block text-sm text-ink2">{s}</span>
                      </span>
                    </button>
                  ))}
                </div>
                {c.code && c.status === "approved" && <ChapterPage code={c.code} />}
                {d.orders.length > 0 && (
                  <div className="card p-6">
                    <h3 className="h-card">Chapter payments</h3>
                    <ul className="mt-3 grid gap-2">
                      {d.orders.map((o: any) => (
                        <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
                          <span>
                            {o.seats} {o.seats === 1 ? "student" : "students"}, {shortDate(o.paid_at ?? o.created_at)}
                            {o.receipt_no ? `, receipt ${o.receipt_no}` : ""}
                          </span>
                          <span className="readout font-medium">{inr(o.total_paise)}</span>
                        </li>
                      ))}
                    </ul>
                    <ChapterReceipts orders={d.orders} />
                  </div>
                )}
              </div>
            )}
            {tab === "students" && (
              <div className="card p-5 sm:p-7">
                <Roster d={d} reload={reload} />
              </div>
            )}
            {tab === "add" && (
              <div className="card grid gap-5 p-5 sm:p-7">
                {c.status === "suspended" ? (
                  <Note tone="bad">A suspended chapter cannot add students.</Note>
                ) : (
                  <>
                    <p className="text-ink2">
                      {c.kind === "college"
                        ? `Students within the ${c.free_seats ?? 15} free seats wait for GRAAS approval. Students beyond them can be paid for straight away on the Overview tab.`
                        : "Every school student waits for GRAAS approval, then gets a login by email."}
                    </p>
                    <AddStudents d={d} onAdded={(m) => reload(m)} />
                  </>
                )}
              </div>
            )}
            {tab === "events" && <ChapterEvents />}
            {tab === "certificate" && (
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                  <h2 className="h-card !text-2xl">Chapter certificate</h2>
                  <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                    Print or save as PDF
                  </button>
                </div>
                {c.status === "approved" ? <ChapterCertificate c={c} /> : <Note tone="bad">The certificate is not available while the chapter is suspended.</Note>}
              </div>
            )}
            {tab === "details" && (
              <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                <div className="card p-5 sm:p-7">
                  <h2 className="h-card mb-4">Details</h2>
                  <DetailsForm d={d} kind={kind} onSaved={(m) => reload(m)} />
                </div>
                <div className="card p-5 sm:p-7">
                  <h2 className="h-card mb-4">Principal&apos;s letter</h2>
                  <LetterBox d={d} onSaved={(m) => reload(m)} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** Printable receipts for chapter seat payments, kept in the console because a chapter login has no member area. */
function ChapterReceipts({ orders }: { orders: any[] }) {
  const [open, setOpen] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  useEffect(() => {
    browserClient()
      .from("site_settings")
      .select("value")
      .eq("key", "org")
      .maybeSingle()
      .then(({ data }) => setOrg(data?.value ?? null));
  }, []);
  const paid = orders.filter((o) => o.receipt_no);
  if (!paid.length) return null;
  return (
    <div className="mt-4 grid gap-3">
      <div className="flex flex-wrap gap-2 print:hidden">
        {paid.map((o) => (
          <button key={o.id} type="button" className="btn btn-ghost !min-h-10" onClick={() => setOpen(open?.id === o.id ? null : o)}>
            {open?.id === o.id ? "Close receipt" : `Receipt ${o.receipt_no}`}
          </button>
        ))}
        {open && (
          <button type="button" className="btn btn-primary !min-h-10" onClick={() => window.print()}>
            Print or save as PDF
          </button>
        )}
      </div>
      {open && <Receipt o={{ ...open, chapter_id: open.chapter_id ?? true }} org={org} />}
    </div>
  );
}

/** Competitions, workshops, lectures, meetups and visits the chapter announces (GRAAS approves each one). */
/* The chapter's public GRAAS page (the same page its certificate QR opens), to share with students and the college. */
function ChapterPage({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const url = `https://graas.org.in/m/${code}`;
  return (
    <div className="card flex flex-wrap items-center gap-5 p-5 sm:p-6">
      <Qr value={url} size={112} className="rounded-lg ring-1 ring-line" />
      <div className="min-w-0 flex-1">
        <h3 className="h-card">Your chapter&apos;s GRAAS page</h3>
        <p className="mt-1 text-sm text-ink2">Shows that the chapter is approved and active, how many members it has, and its events. Put the QR on notice boards and posters, or share the link in student groups.</p>
        <p className="readout mt-2 break-all text-sm font-medium">graas.org.in/m/{code}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-ghost !min-h-10"
          onClick={() =>
            navigator.clipboard?.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            })
          }
        >
          {copied ? "Link copied" : "Copy link"}
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="btn btn-primary !min-h-10">
          Open the page
        </a>
      </div>
    </div>
  );
}

function ChapterEvents() {
  const [list, setList] = useState<any[] | null>(null);
  const load = useCallback(async () => {
    const { data } = await browserClient().rpc("chapter_events");
    setList((data as any[]) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  if (!list) return <p className="text-ink2">Loading…</p>;
  return (
    <div className="grid gap-6">
      <HostEvents mode="chapter" events={list} reload={load} />
      <div className="card p-6">
        <ChangePassword />
      </div>
    </div>
  );
}

function CoordinatorFirstPassword({ done }: { done: () => void }) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const p1 = String(f.get("password") ?? ""), p2 = String(f.get("password2") ?? "");
    if (p1.length < 8) return setErr("Use at least 8 characters.");
    if (p1 !== p2) return setErr("The two passwords do not match.");
    if (f.get("accept") !== "on") return setErr("Please accept the terms of use and the code of conduct.");
    setBusy(true);
    const r = await portal("first_password", { password: p1, accept: true });
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "Could not save the password.");
    done();
  }
  return (
    <section className="bg-mist">
      <div className="mx-auto w-full max-w-xl px-5 py-14">
        <p className="text-sm text-ink2">Chapter console</p>
        <h1 className="h-section mt-1">Choose your password</h1>
        <p className="lede mt-3">This login belongs to the chapter. Replace the first password from the email with one only you know.</p>
        <form onSubmit={save} className="card mt-7 grid gap-4 p-6 sm:p-8" noValidate>
          <label className="grid gap-1.5 font-medium">
            New password
            <input name="password" type="password" className="field" autoComplete="new-password" minLength={8} maxLength={72} required />
          </label>
          <label className="grid gap-1.5 font-medium">
            Type it again
            <input name="password2" type="password" className="field" autoComplete="new-password" maxLength={72} required />
          </label>
          <label className="flex items-start gap-3 text-[0.95rem]">
            <input type="checkbox" name="accept" className="mt-1 h-5 w-5 accent-[#067a2e]" />
            <span>
              I accept the{" "}
              <Link href="/policies/terms" target="_blank" className="font-semibold underline">
                Terms of use
              </Link>{" "}
              and the{" "}
              <Link href="/policies/code-of-conduct" target="_blank" className="font-semibold underline">
                Code of conduct
              </Link>
              .
            </span>
          </label>
          {err && <p className="rounded-xl bg-[#fff1ef] px-4 py-3 font-medium text-[#8f1a11]">{err}</p>}
          <button className="btn btn-primary justify-self-start" disabled={busy}>
            {busy ? "Saving…" : "Save and continue"}
          </button>
        </form>
      </div>
    </section>
  );
}
