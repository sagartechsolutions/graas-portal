/* Reads a chapter's student list from an Excel (.xlsx) or CSV file and tidies each value to what GRAAS expects.
   Nothing leaves the browser here: the rows are checked by the database before anything is added. */

export type RosterRow = Record<string, string>;
type Options = { courses: { name: string; years: string[]; branches: boolean }[]; branches: string[]; genders: string[] };

const KEYS: [RegExp, string][] = [
  [/^(parentorguardianname|guardianname|parentname|fathername|mothername|parentguardianname)/, "guardian_name"],
  [/^(parentorguardianmobile|guardianmobile|parentmobile|guardianphone|parentphone|parentguardianmobile|parentcontact)/, "guardian_phone"],
  [/^(fullname|name|studentname|nameofstudent|nameofthestudent|studentfullname)$/, "full_name"],
  [/^(email|emailid|emailaddress|mail|studentemail)/, "email"],
  [/^(mobile|phone|contact|mobilenumber|phonenumber|mobileno|whatsapp)/, "phone"],
  [/^(gender|sex)/, "gender"],
  [/^(dateofbirth|dob|birthdate|birthday)/, "dob"],
  [/^(course|programme|program|degree)/, "course"],
  [/^(year|yearofstudy|class|standard|std|grade|division)$/, "study_year"],
  [/^(branchifother|otherbranch|branchother)/, "branch_other"],
  [/^(branch|department|dept|discipline)/, "branch"],
  [/^(rollnumber|rollno|roll|enrolment|enrollment|prn|admissionnumber|grno)/, "roll_no"],
];

const norm = (h: unknown) =>
  String(h ?? "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");

function keyFor(h: unknown) {
  const n = norm(h);
  if (!n) return null;
  for (const [re, k] of KEYS) if (re.test(n)) return k;
  return null;
}

const pad = (n: number) => String(n).padStart(2, "0");

function dobValue(v: unknown): string {
  if (v instanceof Date && !isNaN(v.getTime())) return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  if (typeof v === "number" && v > 1000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$/);
  if (m) return `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
  m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`;
  return s;
}

function genderValue(v: string, o: Options) {
  const s = v.trim().toLowerCase();
  if (!s) return "";
  if (["m", "male", "boy", "man"].includes(s)) return "Male";
  if (["f", "female", "girl", "woman"].includes(s)) return "Female";
  return o.genders.find((g) => g.toLowerCase() === s) ?? (s.startsWith("prefer") ? "Prefer not to say" : v.trim());
}

function courseValue(v: string, o: Options) {
  const s = v.trim().toLowerCase();
  if (!s) return "";
  const exact = o.courses.find((c) => c.name.toLowerCase() === s);
  if (exact) return exact.name;
  const t = s.replace(/[^a-z]/g, "");
  const find = (re: RegExp) => o.courses.find((c) => re.test(c.name.toLowerCase()))?.name;
  if (/diploma|poly/.test(t)) return find(/diploma/) ?? v;
  if (/^(me|mtech|mengg|postgrad|pg)/.test(t)) return find(/postgraduate/) ?? v;
  if (/^(be|btech|bengg|engineering|degree)/.test(t)) return find(/engineering/) ?? v;
  if (/phd/.test(t)) return find(/phd/) ?? v;
  if (/^iti/.test(t)) return find(/^iti/) ?? v;
  if (/bsc|bca|msc|mca|science|computer/.test(t)) return find(/science/) ?? v;
  return find(new RegExp("^" + s.slice(0, 4).replace(/[^a-z]/g, ""))) ?? v.trim();
}

const ORD = ["", "1st", "2nd", "3rd", "4th", "5th"];
const WORDS: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, fy: 1, sy: 2, ty: 3, fe: 1, se: 2, te: 3, be: 4 };
const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };

function yearValue(v: unknown, school: boolean) {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  const s = raw.toLowerCase().replace(/\./g, "");
  if (school) {
    const d = s.match(/(\d{1,2})/);
    if (d && Number(d[1]) >= 1 && Number(d[1]) <= 12) return `Class ${Number(d[1])}`;
    const r = s.replace(/^(class|std|standard|grade)\s*/, "").replace(/(st|nd|rd|th)$/, "").trim();
    if (ROMAN[r]) return `Class ${ROMAN[r]}`;
    return raw;
  }
  const d = s.match(/^(\d)/);
  if (d && Number(d[1]) >= 1 && Number(d[1]) <= 5) return `${ORD[Number(d[1])]} year`;
  const w = s.replace(/\s*year$/, "").replace(/[^a-z]/g, "");
  if (WORDS[w]) return `${ORD[WORDS[w]]} year`;
  return raw;
}

const BRANCH_HINTS: [RegExp, string][] = [
  [/^(mech|me)$|mechanical/, "Mechanical"],
  [/mechatronic/, "Mechatronics"],
  [/robot|automation/, "Robotics and Automation"],
  [/^(entc|etc|extc|e&tc|ece)$|telecom/, "Electronics and Telecommunication"],
  [/^(ee|elect|electrical|eee)$|electrical/, "Electrical"],
  [/^(ex|electronics)$/, "Electronics"],
  [/instrument/, "Instrumentation"],
  [/^(cse|cs|comp|computer|co)$|computer/, "Computer"],
  [/^it$|information/, "Information Technology"],
  [/aids|ai&ds|aiandds|artificial|datascience/, "Artificial Intelligence and Data Science"],
  [/civil/, "Civil"],
  [/production|^prod$/, "Production"],
  [/auto/, "Automobile"],
  [/chem/, "Chemical"],
];

function branchValue(v: string, o: Options) {
  const s = v.trim().toLowerCase();
  if (!s) return "";
  const exact = o.branches.find((b) => b.toLowerCase() === s);
  if (exact) return exact;
  const t = s.replace(/\s+/g, "");
  for (const [re, name] of BRANCH_HINTS) if (re.test(t) && o.branches.includes(name)) return name;
  return v.trim();
}

function tidy(row: RosterRow, school: boolean, o: Options): RosterRow {
  const r = { ...row };
  r.full_name = (r.full_name ?? "").replace(/\s+/g, " ").trim().replace(/\s*\(example.*$/i, "");
  r.email = (r.email ?? "").trim().toLowerCase();
  r.phone = (r.phone ?? "").replace(/\D/g, "").slice(-10);
  r.guardian_phone = (r.guardian_phone ?? "").replace(/\D/g, "").slice(-10);
  r.gender = genderValue(r.gender ?? "", o);
  r.dob = dobValue(row.dob);
  r.study_year = yearValue(row.study_year, school);
  if (!school) {
    r.course = courseValue(r.course ?? "", o);
    r.branch = branchValue(r.branch ?? "", o);
  } else {
    delete r.course;
    delete r.branch;
  }
  return r;
}

/** Turns a table (first row = headings) into student rows. Returns the rows and any headings that were not understood. */
export function rowsFromTable(table: unknown[][], school: boolean, o: Options) {
  const headIndex = table.findIndex((r) => (r ?? []).filter((c) => keyFor(c)).length >= 2);
  if (headIndex < 0) return { rows: [] as RosterRow[], unknown: [] as string[], error: "The file has no heading row. Use the GRAAS template, or put headings such as Full name, Email, Gender in the first row." };
  const heads = table[headIndex].map(keyFor);
  const unknown = table[headIndex].filter((h, i) => String(h ?? "").trim() && !heads[i]).map(String);
  const rows: RosterRow[] = [];
  for (const line of table.slice(headIndex + 1)) {
    if (!line || line.every((c) => String(c ?? "").trim() === "")) continue;
    const r: RosterRow = {};
    heads.forEach((k, i) => {
      if (!k) return;
      const val = line[i];
      r[k] = k === "dob" || k === "study_year" ? (val as string) : String(val ?? "").trim();
    });
    // Skip the green example row and the hint row from the template.
    if (/example: delete this row/i.test(String(r.full_name ?? ""))) continue;
    if (/as it should appear/i.test(String(r.full_name ?? ""))) continue;
    rows.push(tidy(r, school, o));
  }
  return { rows, unknown, error: rows.length ? null : "No students were found under the heading row." };
}

/** CSV with quoted fields. */
export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); out.push(row); row = []; cur = "";
    } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); out.push(row); }
  return out;
}

export async function readFileTable(file: File): Promise<unknown[][]> {
  if (/\.csv$/i.test(file.name) || file.type === "text/csv") return parseCsv((await file.text()).replace(/^﻿/, ""));
  const { readSheet } = await import("read-excel-file/browser");
  try {
    return (await readSheet(file, "Students")) as unknown[][];
  } catch {
    return (await readSheet(file)) as unknown[][];
  }
}
