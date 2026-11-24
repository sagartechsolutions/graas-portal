"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/browser";

/** Dropdown lists for member details. Staff edit them in Admin, Settings; nothing here is fixed in code. */
export type Course = { name: string; years: string[]; branches: boolean };
export type ProfileOptions = { genders: string[]; courses: Course[]; branches: string[] };
export const EMPTY_OPTIONS: ProfileOptions = { genders: [], courses: [], branches: [] };

export const ORG_LABEL: Record<string, string> = {
  student: "College or institute",
  professional: "Company or organisation",
  institution: "Name of the institution",
  industry: "Name of the company",
};
export const ROLE_LABEL: Record<string, string> = { professional: "Designation", institution: "Your designation there", industry: "Your designation there" };
export const ROLE_HINT: Record<string, string> = { professional: "For example Automation engineer", institution: "For example Head of department", industry: "For example HR manager" };

export const isIndividual = (aud?: string | null) => aud === "student" || aud === "professional";

/** True when the date of birth makes the person younger than 18 on `today` (YYYY-MM-DD). */
export function isMinor(dob: string | null | undefined, today = new Date().toISOString().slice(0, 10)) {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
  const [y, m, d] = today.split("-").map(Number);
  const eighteen = `${y - 18}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return dob > eighteen;
}

type Bad = (f: string) => Record<string, unknown>;

/**
 * Gender for individuals; course, year and branch for students. The year list follows the course,
 * and the branch appears only for courses that have branches. Field names match the database.
 */
export const isSchoolCourse = (name?: string | null) => typeof name === "string" && /^school/i.test(name);

export function PersonFields({ audience, options, initial = {}, bad = () => ({}), lbl, school = false }: { audience: string; options: ProfileOptions; initial?: Record<string, any>; bad?: Bad; lbl: string; school?: boolean }) {
  const [course, setCourse] = useState<string>(initial.course ?? "");
  const [branch, setBranch] = useState<string>(initial.branch ?? "");
  // School classes are only for students their school adds; everyone else chooses a college course.
  const courses = options.courses.filter((x) => (school ? isSchoolCourse(x.name) : !isSchoolCourse(x.name)));
  const c = courses.find((x) => x.name === course);
  if (!isIndividual(audience)) return null;
  return (
    <>
      <label className={lbl}>
        Gender
        <select name="gender" className="field" defaultValue={options.genders.includes(initial.gender) ? initial.gender : ""} required {...bad("gender")}>
          <option value="" disabled>
            Choose
          </option>
          {options.genders.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </label>
      {audience === "student" && (
        <>
          {school ? (
            <input type="hidden" name="course" value={courses[0]?.name ?? ""} />
          ) : (
            <label className={lbl}>
              Course
              <select name="course" className="field" value={c ? course : ""} onChange={(e) => setCourse(e.target.value)} required {...bad("course")}>
                <option value="" disabled>
                  Choose your course
                </option>
                {courses.map((x) => (
                  <option key={x.name}>{x.name}</option>
                ))}
              </select>
            </label>
          )}
          {!school && course === "Other" && (
            <label className={lbl}>
              Name of your course
              <input name="course_other" className="field" defaultValue={initial.course_other ?? ""} maxLength={80} placeholder="For example B.Voc Mechatronics" required {...bad("course_other")} />
            </label>
          )}
          <label className={lbl}>
            {school ? "Class" : "Year of study"}
            <select key={`y-${course}`} name="study_year" className="field" defaultValue={(school ? courses[0] : c)?.years.includes(initial.study_year) ? initial.study_year : ""} required disabled={!(school ? courses[0] : c)} {...bad("study_year")}>
              <option value="" disabled>
                {school ? "Choose the class" : c ? "Choose your year" : "Choose the course first"}
              </option>
              {((school ? courses[0] : c)?.years ?? []).map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          {!school && c?.branches && (
            <label className={lbl}>
              Branch
              <select key={`b-${course}`} name="branch" className="field" value={options.branches.includes(branch) ? branch : ""} onChange={(e) => setBranch(e.target.value)} required {...bad("branch")}>
                <option value="" disabled>
                  Choose your branch
                </option>
                {options.branches.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
          )}
          {!school && c?.branches && branch === "Other" && (
            <label className={lbl}>
              Name of your branch
              <input name="branch_other" className="field" defaultValue={initial.branch_other ?? ""} maxLength={80} placeholder="For example Mining engineering" required autoFocus={!initial.branch_other} {...bad("branch_other")} />
            </label>
          )}
        </>
      )}
    </>
  );
}

/** Parent or guardian, asked only for members under 18. */
export function GuardianFields({ initial = {}, bad = () => ({}), lbl, withAgree = false }: { initial?: Record<string, any>; bad?: Bad; lbl: string; withAgree?: boolean }) {
  return (
    <div className="grid gap-4 rounded-2xl border border-line bg-mist p-4 sm:col-span-2 sm:p-5">
      <div>
        <p className="font-semibold">Parent or guardian</p>
        <p className="text-sm text-ink2">You are under 18, so a parent or guardian agrees to your membership. GRAAS may contact them about it.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={lbl}>
          Their full name
          <input name="guardian_name" className="field bg-white" defaultValue={initial.guardian_name ?? ""} maxLength={80} required {...bad("guardian_name")} />
        </label>
        <label className={lbl}>
          Their mobile number
          <input name="guardian_phone" className="field bg-white" type="tel" inputMode="numeric" defaultValue={initial.guardian_phone ?? ""} placeholder="10-digit number" maxLength={14} required {...bad("guardian_phone")} />
        </label>
      </div>
      {withAgree && (
        <label className="flex items-start gap-3 text-[0.95rem]">
          <input type="checkbox" name="guardian_agree" className="mt-1 h-5 w-5 shrink-0 accent-[#067a2e]" {...bad("guardian_agree")} />
          <span>My parent or guardian has read the membership rules and agrees to my membership.</span>
        </label>
      )}
    </div>
  );
}

/** The lines that describe a member under their name, by member type, from the current profile. */
export function describe(p: any, audience: string): { label: string; value: string }[] {
  const has = (v: unknown) => typeof v === "string" && v.trim() !== "";
  const rows: { label: string; value: string }[] = [];
  if (audience === "student") {
    const school = typeof p.course === "string" && /^school/i.test(p.course);
    const course = p.course === "Other" && has(p.course_other) ? p.course_other : p.course;
    const branch = p.branch === "Other" && has(p.branch_other) ? p.branch_other : p.branch;
    if (has(p.organisation)) rows.push({ label: school ? "School" : "College", value: p.organisation });
    if (school) {
      if (has(p.study_year)) rows.push({ label: "Class", value: p.study_year });
    } else if (has(course)) rows.push({ label: "Course", value: course + (has(p.study_year) ? `, ${p.study_year}` : "") });
    else if (has(p.study_year)) rows.push({ label: "Year", value: p.study_year });
    if (has(branch)) rows.push({ label: "Branch", value: branch });
  } else if (audience === "professional") {
    if (has(p.designation)) rows.push({ label: "Role", value: p.designation });
    if (has(p.organisation)) rows.push({ label: "Organisation", value: p.organisation });
  } else {
    if (has(p.full_name)) rows.push({ label: "Represented by", value: p.full_name + (has(p.designation) ? `, ${p.designation}` : "") });
  }
  if (has(p.city)) rows.push({ label: "City", value: p.city + (has(p.state) && p.state !== "Outside India" ? `, ${p.state}` : "") });
  return rows;
}

const photoPath = (userId: string) => `${userId}/photo.jpg`;

/** A short-lived link to the member's own photo (or a staff member viewing it). Null when there is none. */
export function usePhoto(userId: string | null | undefined, stamp: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (!userId || !stamp) {
      Promise.resolve().then(() => live && setUrl(null));
      return () => {
        live = false;
      };
    }
    browserClient()
      .storage.from("member-photos")
      .createSignedUrl(photoPath(userId), 3600)
      .then(({ data }) => live && setUrl(data?.signedUrl ? `${data.signedUrl}&v=${encodeURIComponent(stamp)}` : null));
    return () => {
      live = false;
    };
  }, [userId, stamp]);
  return url;
}

/** Crops the picture to a centred square, scales it to 640 px and saves it as a JPEG. */
async function squareJpeg(file: File): Promise<Blob> {
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => bad(new Error("That file could not be opened as a picture."));
      i.src = src;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (side < 200) throw new Error("The picture is too small. Use one at least 200 pixels wide.");
    const size = Math.min(640, side);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    // Faces sit in the upper part of most portrait photos, so a tall picture is cropped a little above centre.
    const sx = (img.naturalWidth - side) / 2;
    const sy = img.naturalHeight > img.naturalWidth ? (img.naturalHeight - side) * 0.3 : (img.naturalHeight - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return await new Promise<Blob>((ok, bad) => canvas.toBlob((b) => (b ? ok(b) : bad(new Error("Could not prepare the picture."))), "image/jpeg", 0.88));
  } finally {
    URL.revokeObjectURL(src);
  }
}

export async function uploadPhoto(userId: string, file: File): Promise<string | null> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return "Choose a JPG, PNG or WebP picture.";
  if (file.size > 12 * 1024 * 1024) return "That picture is larger than 12 MB. Choose a smaller one.";
  let blob: Blob;
  try {
    blob = await squareJpeg(file);
  } catch (e) {
    return (e as Error).message;
  }
  const sb = browserClient();
  const up = await sb.storage.from("member-photos").upload(photoPath(userId), blob, { upsert: true, contentType: "image/jpeg", cacheControl: "60" });
  if (up.error) return "The picture could not be saved. Please try again.";
  const { data } = await sb.rpc("member_set_photo", { p_on: true });
  return data?.ok ? null : "The picture was saved but could not be linked to your account. Please try again.";
}

export async function removePhoto(userId: string): Promise<string | null> {
  const sb = browserClient();
  await sb.storage.from("member-photos").remove([photoPath(userId)]);
  const { data } = await sb.rpc("member_set_photo", { p_on: false });
  return data?.ok ? null : "Could not remove the picture. Please try again.";
}

/** Initials for when there is no photo. */
export function initials(name: string | null | undefined) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "G";
}
