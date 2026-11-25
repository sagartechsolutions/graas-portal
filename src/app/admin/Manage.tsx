"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { portal } from "@/lib/browser";
import { INDIAN_STATES } from "@/lib/money";
import { Msg, lbl, sb } from "./shared";

/* Staff tools to create and correct records: add a member, edit a member, open a chapter for a college or school,
   change a chapter's coordinator, edit or remove a chapter. */

type Note = { tone: "good" | "bad"; text: string } | null;
const BRANCHES = ["Mechanical", "Electrical", "Electronics and Telecommunication", "Computer", "Information Technology", "Mechatronics", "Automation and Robotics", "Instrumentation", "Civil", "Chemical", "Production", "Artificial Intelligence and Data Science", "Other"];

function Field({ label, name, f, set, type = "text", ph, bad }: { label: string; name: string; f: any; set: (k: string, v: any) => void; type?: string; ph?: string; bad?: string | null }) {
  return (
    <label className={lbl}>
      {label}
      <input className="field !min-h-10" type={type} value={f[name] ?? ""} placeholder={ph} aria-invalid={bad === name || undefined} onChange={(e) => set(name, type === "tel" ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value)} />
    </label>
  );
}

export function AddMember({ role, onDone, onCancel }: { role: string; onDone: (msg: string) => void; onCancel: () => void }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [f, setF] = useState<any>({ plan_code: "student-annual", state: "Maharashtra" });
  const [msg, setMsg] = useState<Note>(null);
  const [bad, setBad] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  useEffect(() => {
    sb()
      .from("membership_plans")
      .select("code,name,audience,self_join")
      .order("sort_order")
      .then(({ data }) => setPlans((data ?? []).filter((p: any) => p.self_join !== false)));
  }, []);
  const org = ["institution", "industry"].includes(plans.find((p) => p.code === f.plan_code)?.audience);
  async function save() {
    setBusy(true);
    setMsg(null);
    const r = await portal("admin_member_create", { ...f, complimentary: !!f.complimentary });
    setBusy(false);
    setBad((r.field as string) ?? null);
    if (!r.ok) return setMsg({ tone: "bad", text: r.error ?? "Could not add the member." });
    onDone(`${f.full_name} added${r.active ? " and active" : ", waiting for payment"}. ${r.emailed ? `Login sent to ${r.sent_to}.` : "The login email could not be sent; use Resend from their record."}`);
  }
  return (
    <div className="plate grid gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">Add a member</h3>
          <p className="text-sm text-ink2">GRAAS creates the login and emails a first password. The member sets their own password, takes the pledge and completes the profile at first sign-in. School students join only through a school chapter.</p>
        </div>
        <button type="button" className="btn-quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className={lbl}>
          Membership type
          <select className="field !min-h-10" value={f.plan_code} onChange={(e) => set("plan_code", e.target.value)}>
            {plans.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <Field label={org ? "Contact person's full name" : "Full name"} name="full_name" f={f} set={set} bad={bad} />
        <Field label="Email (login ID)" name="email" type="email" f={f} set={set} bad={bad} />
        <Field label="Mobile" name="phone" type="tel" f={f} set={set} bad={bad} />
        <Field label={org ? "Organisation name" : "College, school or company"} name="organisation" f={f} set={set} bad={bad} />
        <Field label="Designation" name="designation" f={f} set={set} bad={bad} />
        <Field label="City" name="city" f={f} set={set} bad={bad} />
        <label className={lbl}>
          State
          <select className="field !min-h-10" value={f.state ?? ""} onChange={(e) => set("state", e.target.value)}>
            {INDIAN_STATES.map((s: string) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {role === "super_admin" && (
        <div className="grid gap-2 rounded-xl bg-mist p-4">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="h-4 w-4 accent-[#067a2e]" checked={!!f.complimentary} onChange={(e) => set("complimentary", e.target.checked)} />
            Activate now without payment (complimentary)
          </label>
          {f.complimentary && <Field label="Reason (kept in the record)" name="reason" f={f} set={set} bad={bad} ph="For example: speaker at GRAASCON 2027" />}
        </div>
      )}
      <button type="button" className="btn-go justify-self-start" disabled={busy} onClick={save}>
        {busy ? "Creating…" : "Create member and email the login"}
      </button>
    </div>
  );
}

export function EditMember({ userId, p, onDone }: { userId: string; p: any; onDone: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>(() => ({ full_name: p.full_name, phone: p.phone, city: p.city, state: p.state, organisation: p.organisation, designation: p.designation, dob: p.dob, gender: p.gender, course: p.course, course_other: p.course_other, branch: p.branch, branch_other: p.branch_other, study_year: p.study_year, guardian_name: p.guardian_name, guardian_phone: p.guardian_phone }));
  const [msg, setMsg] = useState<Note>(null);
  const [bad, setBad] = useState<string | null>(null);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  async function save() {
    const { data } = await sb().rpc("staff_member_update", { p_user: userId, p: f });
    setBad(data?.field ?? null);
    if (!data?.ok) return setMsg({ tone: "bad", text: data?.error ?? "Could not save." });
    setOpen(false);
    onDone("Details saved.");
  }
  if (!open)
    return (
      <button type="button" className="btn-quiet justify-self-start" onClick={() => setOpen(true)}>
        Edit details
      </button>
    );
  return (
    <div className="plate grid gap-3 p-5">
      <h4 className="font-semibold">Edit details</h4>
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Full name" name="full_name" f={f} set={set} bad={bad} />
        <Field label="Mobile" name="phone" type="tel" f={f} set={set} bad={bad} />
        <Field label="Date of birth" name="dob" type="date" f={f} set={set} bad={bad} />
        <Field label="Gender" name="gender" f={f} set={set} bad={bad} />
        <Field label="City" name="city" f={f} set={set} bad={bad} />
        <Field label="State" name="state" f={f} set={set} bad={bad} />
        <Field label="College, school or organisation" name="organisation" f={f} set={set} bad={bad} />
        <Field label="Designation" name="designation" f={f} set={set} bad={bad} />
        <Field label="Course" name="course" f={f} set={set} bad={bad} />
        <Field label="Course (other)" name="course_other" f={f} set={set} bad={bad} />
        <Field label="Branch" name="branch" f={f} set={set} bad={bad} />
        <Field label="Branch (other)" name="branch_other" f={f} set={set} bad={bad} />
        <Field label="Year or class" name="study_year" f={f} set={set} bad={bad} />
        <Field label="Parent or guardian" name="guardian_name" f={f} set={set} bad={bad} />
        <Field label="Guardian's mobile" name="guardian_phone" type="tel" f={f} set={set} bad={bad} />
      </div>
      <p className="text-sm text-ink2">Email is the login ID; the member changes it from their account with a code. Changing the mobile number asks them to confirm it again.</p>
      <div className="flex gap-2">
        <button type="button" className="btn-go" onClick={save}>
          Save details
        </button>
        <button type="button" className="btn-quiet" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ChapterFields({ f, set, bad, withHead, withChapter }: { f: any; set: (k: string, v: any) => void; bad: string | null; withHead: boolean; withChapter: boolean }) {
  return (
    <>
      {withChapter && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className={lbl}>
            Type
            <select className="field !min-h-10" value={f.kind} onChange={(e) => set("kind", e.target.value)}>
              <option value="college">College chapter (branch-wise)</option>
              <option value="school">School chapter</option>
            </select>
          </label>
          <Field label={f.kind === "school" ? "School name" : "College name"} name="institution" f={f} set={set} bad={bad} />
          {f.kind === "college" && (
            <label className={lbl}>
              Branch
              <select className="field !min-h-10" value={f.branch ?? ""} aria-invalid={bad === "branch" || undefined} onChange={(e) => set("branch", e.target.value)}>
                <option value="">Choose</option>
                {BRANCHES.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
          )}
          {f.kind === "college" && f.branch === "Other" && <Field label="Name of the branch" name="branch_other" f={f} set={set} bad={bad} />}
          <Field label="City" name="city" f={f} set={set} bad={bad} />
          <Field label="State" name="state" f={f} set={set} bad={bad} />
          <Field label="Principal's name" name="principal_name" f={f} set={set} bad={bad} />
        </div>
      )}
      {withHead && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Coordinator's full name" name="head_name" f={f} set={set} bad={bad} />
          <Field label="Coordinator's email (chapter login)" name="head_email" type="email" f={f} set={set} bad={bad} />
          <Field label="Coordinator's mobile" name="head_phone" type="tel" f={f} set={set} bad={bad} />
          <Field label="Designation" name="head_designation" f={f} set={set} bad={bad} ph={f.kind === "school" ? "Teacher" : "Assistant Professor"} />
          <Field label="Department" name="head_department" f={f} set={set} bad={bad} />
        </div>
      )}
    </>
  );
}

export function ChapterAdd({ onDone, onCancel }: { onDone: (msg: string) => void; onCancel: () => void }) {
  const [f, setF] = useState<any>({ kind: "college", state: "Maharashtra" });
  const [msg, setMsg] = useState<Note>(null);
  const [bad, setBad] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  async function save() {
    setBusy(true);
    const r = await portal("admin_chapter_create", f);
    setBusy(false);
    setBad((r.field as string) ?? null);
    if (!r.ok) return setMsg({ tone: "bad", text: r.error ?? "Could not open the chapter." });
    onDone(`${r.label} opened as a draft. ${r.new_login ? "A chapter login with a first password was emailed to the coordinator." : "The coordinator already had a login and was told by email."}`);
  }
  return (
    <div className="plate grid gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">Open a chapter for a college or school</h3>
          <p className="text-sm text-ink2">The chapter starts as a draft. The coordinator signs in, uploads the principal&apos;s letter, adds students and sends it for approval. The login belongs to the chapter and can be handed over later.</p>
        </div>
        <button type="button" className="btn-quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
      <ChapterFields f={f} set={set} bad={bad} withHead withChapter />
      <button type="button" className="btn-go justify-self-start" disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Open the chapter and email the login"}
      </button>
    </div>
  );
}

/** Edit, hand over or remove one chapter (admin chapter detail). */
export function ChapterManage({ c, onChanged }: { c: any; onChanged: (msg: string) => void }) {
  const [mode, setMode] = useState<"" | "edit" | "transfer" | "remove">("");
  const [f, setF] = useState<any>(() => ({ ...c }));
  const [msg, setMsg] = useState<Note>(null);
  const [bad, setBad] = useState<string | null>(null);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  async function edit() {
    const { data } = await sb().rpc("staff_chapter_update", { p_id: c.id, p: { institution: f.institution, branch: f.branch, branch_other: f.branch_other, city: f.city, state: f.state, principal_name: f.principal_name } });
    if (!data?.ok) return setMsg({ tone: "bad", text: data?.error ?? "Could not save." });
    setMode("");
    onChanged("Chapter details saved.");
  }
  async function transfer() {
    const r = await portal("admin_chapter_transfer", { chapter_id: c.id, head_name: f.new_name, head_email: f.new_email, head_phone: f.new_phone, head_designation: f.new_designation, head_department: f.new_department, reason: f.reason });
    setBad((r.field as string)?.replace("head_", "new_") ?? null);
    if (!r.ok) return setMsg({ tone: "bad", text: r.error ?? "Could not change the coordinator." });
    setMode("");
    onChanged(`Coordinator changed. ${r.new_login ? "A chapter login with a first password was emailed to them." : "They already had a login and were told by email."} The previous coordinator no longer has access.`);
  }
  async function remove(restore: boolean) {
    const { data } = await sb().rpc("staff_chapter_remove", { p_id: c.id, p_note: f.reason ?? null, p_restore: restore });
    if (!data?.ok) return setMsg({ tone: "bad", text: data?.error ?? "Could not do that." });
    setMode("");
    onChanged(restore ? "Chapter restored as suspended. Reinstate it to make it active again." : "Chapter removed. Its students keep their memberships.");
  }
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-quiet" onClick={() => setMode(mode === "edit" ? "" : "edit")}>
          Edit chapter details
        </button>
        <button type="button" className="btn-quiet" onClick={() => setMode(mode === "transfer" ? "" : "transfer")}>
          Change coordinator
        </button>
        {c.removed_at ? (
          <button type="button" className="btn-quiet" onClick={() => remove(true)}>
            Restore chapter
          </button>
        ) : (
          <button type="button" className="btn-quiet !text-[#8f1a11]" onClick={() => setMode(mode === "remove" ? "" : "remove")}>
            Remove chapter
          </button>
        )}
      </div>
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
      {mode === "edit" && (
        <div className="plate grid gap-3 p-5">
          <ChapterFields f={f} set={set} bad={bad} withHead={false} withChapter />
          <button type="button" className="btn-go justify-self-start" onClick={edit}>
            Save details
          </button>
        </div>
      )}
      {mode === "transfer" && (
        <div className="plate grid gap-3 p-5">
          <p className="text-sm text-ink2">Current coordinator: {c.head_name}, {c.head_email}. The chapter login moves to the new person; if their email has no GRAAS login yet, one is created with a first password.</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="New coordinator's full name" name="new_name" f={f} set={set} bad={bad} />
            <Field label="Email (chapter login)" name="new_email" type="email" f={f} set={set} bad={bad} />
            <Field label="Mobile" name="new_phone" type="tel" f={f} set={set} bad={bad} />
            <Field label="Designation" name="new_designation" f={f} set={set} bad={bad} />
            <Field label="Department" name="new_department" f={f} set={set} bad={bad} />
            <Field label="Reason (kept in the record)" name="reason" f={f} set={set} bad={bad} ph="Previous coordinator left the college" />
          </div>
          <button type="button" className="btn-go justify-self-start" onClick={transfer}>
            Change coordinator
          </button>
        </div>
      )}
      {mode === "remove" && (
        <div className="plate grid gap-3 p-5">
          <p className="text-sm text-ink2">The chapter leaves the public list and the coordinator&apos;s console shows it as suspended. Students keep their memberships and certificates. You can restore it later.</p>
          <Field label="Reason (needed)" name="reason" f={f} set={set} bad={bad} />
          <button type="button" className="btn-go justify-self-start !bg-[#8f1a11]" onClick={() => remove(false)}>
            Remove chapter
          </button>
        </div>
      )}
    </div>
  );
}
