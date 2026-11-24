"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Msg, lbl, sb } from "./shared";

type Course = { name: string; years: string[]; branches: boolean };
type Options = { genders: string[]; courses: Course[]; branches: string[] };

const lines = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);

/** Edits the dropdown lists members choose from: gender, course (with its years), and branch. */
export function ProfileOptionsEditor({ session, onSaved }: { session: Session; onSaved: () => Promise<void> }) {
  const [genders, setGenders] = useState("");
  const [branches, setBranches] = useState("");
  const [courses, setCourses] = useState<{ name: string; years: string; branches: boolean }[]>([]);
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  useEffect(() => {
    sb()
      .from("site_settings")
      .select("value")
      .eq("key", "profile_options")
      .maybeSingle()
      .then(({ data }) => {
        const o = (data?.value ?? {}) as Partial<Options>;
        setGenders((o.genders ?? []).join("\n"));
        setBranches((o.branches ?? []).join("\n"));
        setCourses((o.courses ?? []).map((c) => ({ name: c.name, years: c.years.join(", "), branches: !!c.branches })));
      });
  }, []);

  async function save() {
    setMsg(null);
    const value: Options = {
      genders: lines(genders),
      branches: lines(branches),
      courses: courses
        .map((c) => ({ name: c.name.trim(), years: c.years.split(",").map((y) => y.trim()).filter(Boolean), branches: c.branches }))
        .filter((c) => c.name),
    };
    if (value.genders.length === 0 || value.courses.length === 0) return setMsg({ tone: "bad", text: "Keep at least one gender option and one course." });
    if (value.courses.some((c) => c.years.length === 0)) return setMsg({ tone: "bad", text: "Every course needs at least one year, separated by commas." });
    if (value.courses.some((c) => c.branches) && value.branches.length === 0) return setMsg({ tone: "bad", text: "Add branches, or untick “Has branches” on every course." });
    const { error } = await sb().from("site_settings").update({ value, updated_by: session.user.id }).eq("key", "profile_options");
    if (error) return setMsg({ tone: "bad", text: error.message });
    await onSaved();
    setMsg({ tone: "good", text: "Saved. The join form and profiles use these lists now." });
  }

  return (
    <div className="plate grid gap-4 p-5">
      <div>
        <h3 className="text-xl font-semibold">Member details: dropdown lists</h3>
        <p className="mt-1 text-sm text-ink2">What members choose from when they join or edit their profile. Renaming an option does not change what members already saved.</p>
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-semibold">Courses</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="text-left text-ink2">
              <tr>
                <th className="py-1.5 pr-3 font-semibold">Course name</th>
                <th className="py-1.5 pr-3 font-semibold">Years, separated by commas</th>
                <th className="py-1.5 pr-3 font-semibold">Has branches</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {courses.map((c, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-1.5 pr-3">
                    <input className="field !min-h-9 w-full" value={c.name} onChange={(e) => setCourses((cs) => cs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label="Course name" />
                  </td>
                  <td className="py-1.5 pr-3">
                    <input className="field !min-h-9 w-full" value={c.years} onChange={(e) => setCourses((cs) => cs.map((x, j) => (j === i ? { ...x, years: e.target.value } : x)))} aria-label="Years" />
                  </td>
                  <td className="py-1.5 pr-3">
                    <input type="checkbox" className="h-4 w-4 accent-[#067a2e]" checked={c.branches} onChange={(e) => setCourses((cs) => cs.map((x, j) => (j === i ? { ...x, branches: e.target.checked } : x)))} aria-label="Has branches" />
                  </td>
                  <td className="py-1.5 text-right">
                    <button type="button" className="text-sm font-semibold text-[#8f1a11] underline underline-offset-4" onClick={() => setCourses((cs) => cs.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="justify-self-start text-sm font-semibold underline decoration-go decoration-2 underline-offset-4" onClick={() => setCourses((cs) => [...cs, { name: "", years: "1st year, 2nd year, 3rd year", branches: false }])}>
          Add a course
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={lbl}>
          Branches, one per line
          <textarea className="field min-h-48" value={branches} onChange={(e) => setBranches(e.target.value)} />
        </label>
        <label className={lbl}>
          Gender options, one per line
          <textarea className="field min-h-48" value={genders} onChange={(e) => setGenders(e.target.value)} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" className="btn btn-go !min-h-10 !py-2" onClick={save}>
          Save lists
        </button>
        {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
      </div>
    </div>
  );
}
