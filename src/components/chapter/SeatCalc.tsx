"use client";

import { useState } from "react";

const rupees = (n: number) => "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n));

/** How many seats are free and what the rest cost, for a chapter of a given size. */
export default function SeatCalc({ freeSeats, minMembers, seatFee }: { freeSeats: number; minMembers: number; seatFee: number | null }) {
  const [kind, setKind] = useState<"college" | "school">("college");
  const [n, setN] = useState(30);
  const free = kind === "school" ? n : Math.min(n, freeSeats);
  const paid = kind === "school" ? 0 : Math.max(0, n - freeSeats);
  const cost = seatFee ? paid * seatFee : null;
  const tooFew = kind === "college" && n < minMembers;
  const max = 120;
  return (
    <div className="grid overflow-hidden rounded-[28px] border border-line bg-white shadow-[var(--shadow-card)] lg:grid-cols-[1.2fr_1fr]">
      <div className="grid content-start gap-6 p-6 sm:p-8">
        <div className="flex flex-wrap gap-2">
          {(["college", "school"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={`rounded-full border px-4 py-2 font-semibold transition-colors ${kind === k ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>
              {k === "college" ? "College chapter" : "School chapter"}
            </button>
          ))}
        </div>
        <label className="grid gap-3">
          <span className="flex items-baseline justify-between gap-4">
            <span className="font-semibold">Students in the chapter</span>
            <span className="readout text-3xl font-medium">{n}</span>
          </span>
          <input type="range" className="jog" min={1} max={max} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="Number of students" />
        </label>
        {/* Seats, drawn as a grid of dots */}
        <div aria-hidden="true" className="flex flex-wrap gap-1.5">
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className="h-3.5 w-3.5 rounded-full transition-colors duration-300" style={{ background: i < free ? "#02ae3e" : "#000e21", opacity: i < free ? 1 : 0.85 }} />
          ))}
        </div>
        <p className="flex flex-wrap gap-4 text-sm text-ink2">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-go" /> Free seat</span>
          {kind === "college" && <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-ink" /> Student fee</span>}
        </p>
      </div>
      <div className="grid content-center gap-4 bg-mist p-6 sm:p-8">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-ink2">Free memberships</p>
            <p className="readout mt-1 text-3xl font-medium text-go-deep">{free}</p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-ink2">At the Student fee</p>
            <p className="readout mt-1 text-3xl font-medium">{paid}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-ink p-5 text-white">
          <p className="text-sm text-white/65">{kind === "school" ? "Cost to the school" : "For the extra students, a year"}</p>
          <p className="readout mt-1 text-4xl font-medium">{kind === "school" || paid === 0 ? "₹0" : cost !== null ? rupees(cost) : "Student fee"}</p>
          {kind === "college" && paid > 0 && seatFee && <p className="mt-2 text-sm text-white/65">{paid} × {rupees(seatFee)}. The chapter can pay in one go, or each student pays from their own account.</p>}
        </div>
        {tooFew && <p className="rounded-xl bg-[#fff4e5] px-4 py-3 text-sm font-medium text-[#8a4b00]">A college chapter starts with at least {minMembers} students.</p>}
      </div>
    </div>
  );
}
