"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/ui/Icon";

type F = Record<string, string>;
const today = () => new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");

/** A sample letter from the principal asking GRAAS to form a chapter. Typed details fill the letter as you go. */
export default function LetterApp({ freeSeats, minMembers }: { freeSeats: number; minMembers: number }) {
  const params = useSearchParams();
  const [kind, setKind] = useState<"college" | "school">(params.get("kind") === "school" ? "school" : "college");
  const [f, setF] = useState<F>({ date: today() });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const v = (k: string, ph: string) => (f[k]?.trim() ? <span className="font-semibold">{f[k]}</span> : <span className="rounded bg-[#fff4d6] px-1 text-[#8a4b00]">[{ph}]</span>);
  const inst = kind === "college" ? "college" : "school";
  const fields: [string, string, string?][] = [
    ["institution", `Name of the ${inst}`],
    ["city", "City"],
    ["state", "State"],
    ...(kind === "college" ? ([["branch", "Branch or department"]] as [string, string][]) : []),
    ["coordinator", kind === "college" ? "Faculty coordinator's name" : "Teacher coordinator's name"],
    ["designation", "Coordinator's designation"],
    ["mobile", "Coordinator's mobile"],
    ["email", "Coordinator's email"],
    ["students", "Number of students"],
    ["principal", "Principal's name"],
    ["pphone", "Principal's phone"],
    ["pemail", "Principal's email"],
    ["refno", "Reference number"],
    ["date", "Date"],
  ];
  const lbl = "grid gap-1 text-sm font-semibold";
  return (
    <section className="bg-mist">
      <div className="shell grid gap-8 pb-12 pt-7 lg:grid-cols-[minmax(20rem,0.75fr)_minmax(0,1.25fr)] lg:pb-16 lg:pt-10">
        <div className="print:hidden">
          <p className="text-sm font-semibold text-go-deep">Template</p>
          <h1 className="h-section mt-1">The principal&apos;s letter</h1>
          <p className="mt-3 text-ink2">
            Type the details and the letter fills in. Print it on the {inst}&apos;s letterhead, have the principal sign and stamp it, and upload a PDF or a clear photo
            in the chapter console. Prefer Word? Download the file below.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(["college", "school"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={`rounded-full border px-4 py-2 font-semibold ${kind === k ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
                {k === "college" ? "College chapter" : "School chapter"}
              </button>
            ))}
          </div>
          <div className="card mt-5 grid gap-3 p-5 sm:grid-cols-2">
            {fields.map(([k, label]) => (
              <label key={k} className={`${lbl} ${k === "institution" ? "sm:col-span-2" : ""}`}>
                {label}
                <input className="field !min-h-10 !py-2" value={f[k] ?? ""} onChange={set(k)} maxLength={k === "institution" ? 160 : 80} />
              </label>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              Print or save as PDF
            </button>
            <a href={`/templates/graas-${kind}-chapter-principal-letter.docx`} download className="btn btn-ghost">
              <Icon name="letter" size={18} /> Download for Word
            </a>
          </div>
          <p className="mt-4 text-sm text-ink2">Nothing you type here is saved or sent anywhere.</p>
        </div>

        <div className="print-area print-letter">
          <style>{"@media print { @page { size: A4 portrait; margin: 0; } .print-letter { width: 210mm !important; } .print-letter article { width: 210mm !important; height: 297mm !important; max-width: none !important; font-size: 11.5pt !important; padding: 20mm 22mm !important; } }"}</style>
          <article className="mx-auto aspect-[210/297] w-full max-w-[760px] overflow-hidden bg-white p-[7%] text-[clamp(0.72rem,0.55rem+0.45vw,0.98rem)] leading-relaxed text-ink shadow-[var(--shadow-lift)] print:max-w-none print:shadow-none">
            <p className="text-center text-[0.72em] font-semibold tracking-[0.18em] text-slate5">ON THE LETTERHEAD OF THE {inst.toUpperCase()}</p>
            <div className="mt-[4%] flex justify-between gap-4">
              <p>Ref. No.: {v("refno", "Ref. No.")}</p>
              <p>Date: {v("date", "DD-MM-YYYY")}</p>
            </div>
            <p className="mt-[4%]">
              To,
              <br />
              The Secretary,
              <br />
              Global Robotics And Automation Society (GRAAS)
              <br />
              connect@graas.org.in
            </p>
            <p className="mt-[4%] font-semibold">
              Subject: Request to form a GRAAS {kind === "college" ? <>college chapter for the {v("branch", "Branch")} department</> : "school chapter"}
            </p>
            <p className="mt-[3%]">Respected Sir or Madam,</p>
            {kind === "college" ? (
              <>
                <p className="mt-[2.5%]">
                  {v("institution", "Name of the college")}, {v("city", "City")}, {v("state", "State")}, requests the Global Robotics And Automation Society to form a GRAAS
                  college chapter for the {v("branch", "Branch")} department of our institution.
                </p>
                <p className="mt-[2.5%]">
                  We nominate {v("coordinator", "Name of faculty member")}, {v("designation", "Designation")}, {v("branch", "Branch")} department (mobile {v("mobile", "10-digit number")}, email{" "}
                  {v("email", "email address")}), as the chapter coordinator. The coordinator will manage the chapter on the GRAAS portal, add students and follow the GRAAS
                  membership rules and code of conduct.
                </p>
                <p className="mt-[2.5%]">
                  The chapter starts with {v("students", `number, at least ${minMembers}`)} students of the department, listed on the GRAAS portal. We understand that GRAAS
                  offers the first {freeSeats} student memberships of the chapter free of charge, and that further students are members at the student fee published by GRAAS.
                </p>
                <p className="mt-[2.5%]">The institution permits the chapter to hold its activities on campus, under the supervision of the coordinator, and will support its workshops, talks and competitions as our schedule allows.</p>
              </>
            ) : (
              <>
                <p className="mt-[2.5%]">
                  {v("institution", "Name of the school")}, {v("city", "City")}, {v("state", "State")}, requests the Global Robotics And Automation Society to form a GRAAS school
                  chapter for our students up to Class 12.
                </p>
                <p className="mt-[2.5%]">
                  We nominate {v("coordinator", "Name of teacher")}, {v("designation", "Designation")} (mobile {v("mobile", "10-digit number")}, email {v("email", "email address")}), as
                  the chapter coordinator. The coordinator will manage the chapter on the GRAAS portal, add students and follow the GRAAS membership rules and code of conduct.
                </p>
                <p className="mt-[2.5%]">
                  The chapter starts with {v("students", "number")} students, listed on the GRAAS portal. We confirm that the school has the consent of each student&apos;s parent
                  or guardian for this membership, and that the details given for every student are correct to the best of our knowledge.
                </p>
                <p className="mt-[2.5%]">The school permits the chapter to hold its robotics activities under the supervision of the coordinator.</p>
              </>
            )}
            <p className="mt-[2.5%]">We request you to approve the chapter.</p>
            <p className="mt-[3%]">Thank you.</p>
            <p className="mt-[3%]">Yours sincerely,</p>
            <div className="mt-[9%]">
              <p className="italic text-slate5">[Signature and seal]</p>
              <p className="font-semibold">{v("principal", "Name of the Principal")}</p>
              <p>Principal, {v("institution", kind === "college" ? "Name of the college" : "Name of the school")}</p>
              <p>
                {v("pphone", "Phone")} | {v("pemail", "Email")}
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
