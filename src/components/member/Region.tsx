"use client";

import { useState } from "react";
import { COUNTRIES } from "@/lib/countries";
import { INDIAN_STATES } from "@/lib/money";

/* Country and state fields for membership forms (form names "country" and "state"). In India the state is a list;
   elsewhere it is typed: state, province or region. */
export default function CountryState({ country = "India", state = "", lbl, bad = () => ({}), required = false }: { country?: string | null; state?: string | null; lbl: string; bad?: (k: string) => object; required?: boolean }) {
  const [c, setC] = useState(country || "India");
  const india = c === "India";
  return (
    <>
      <label className={lbl}>
        Country
        <select name="country" className="field" value={c} onChange={(e) => setC(e.target.value)} autoComplete="country-name" {...bad("country")}>
          {COUNTRIES.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label className={lbl}>
        {india ? "State" : "State, province or region"}
        {india ? (
          <select key="in" name="state" className="field" defaultValue={state && INDIAN_STATES.includes(state) ? state : "Maharashtra"} autoComplete="address-level1">
            {INDIAN_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        ) : (
          <input key="other" name="state" className="field" defaultValue={state && !INDIAN_STATES.includes(state) && state !== "Outside India" ? state : ""} maxLength={60} autoComplete="address-level1" required={required} {...bad("state")} />
        )}
      </label>
    </>
  );
}

/** The hint under phone fields. */
export const PHONE_HINT = "In India, your 10-digit mobile. Elsewhere, the number with its country code, for example 44 7700 900123.";
