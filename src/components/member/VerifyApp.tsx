"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LogoMark } from "@/components/site/Logo";
import { browserClient } from "@/lib/browser";
import { shortDate } from "@/lib/money";

type Result = { found: boolean; limited?: boolean; masked?: boolean; kind?: "member" | "chapter"; member_no?: string; name?: string; plan?: string; organisation?: string | null; chapter?: string | null; members?: number; state?: string; member_since?: string; valid_until?: string | null };
const TONE: Record<string, { label: string; cls: string; text: string }> = {
  active: { label: "Active member", cls: "bg-go-soft text-go-deep", text: "This membership is current." },
  expired: { label: "Membership expired", cls: "bg-[#fff4e5] text-[#8a4b00]", text: "This membership has ended and has not been renewed." },
  suspended: { label: "Membership suspended", cls: "bg-[#fff1ef] text-[#8f1a11]", text: "This membership is suspended." },
  inactive: { label: "Not an active member", cls: "bg-mist text-ink2", text: "This number does not belong to a current member." },
};

export default function VerifyApp() {
  const params = useSearchParams();
  const [no, setNo] = useState(params.get("id") ?? "");
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async (value: string) => {
    if (!value.trim()) return;
    setBusy(true);
    const { data } = await browserClient().rpc("verify_member", { p_no: value });
    setRes((data as Result) ?? { found: false });
    setBusy(false);
  }, []);
  useEffect(() => {
    const id = params.get("id");
    if (id) check(id);
  }, [params, check]);

  const t = res?.found ? TONE[res.state ?? "inactive"] : null;
  return (
    <section className="bg-mist">
      <div className="mx-auto w-full max-w-xl px-5 py-10 sm:py-16">
        <h1 className="h-section">Verify a member or chapter</h1>
        <p className="mt-3 text-ink2">Scan the QR code on a GRAAS member ID or certificate, or type the number printed on it.</p>
        <form
          className="mt-8 flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            check(no);
          }}
        >
          <input className="field readout min-w-0 flex-1 uppercase" placeholder="GRAAS-STU-26-00001" value={no} onChange={(e) => setNo(e.target.value)} aria-label="Member or chapter number" />
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Checking…" : "Check"}
          </button>
        </form>
        <div aria-live="polite">
          {res && !res.found && (
            <p className="card mt-8 p-6 font-medium">
              {res.limited ? "Too many checks from this connection. Please try again in an hour." : "No member or chapter has this number. Check the number and try again."}
            </p>
          )}
          {res?.found && t && (
            <div className="card mt-8 overflow-hidden shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-4 bg-ink p-6 text-white">
                <span className="flex items-center gap-3">
                  <LogoMark size={44} tone="light" />
                  <span className="hidden text-sm font-medium leading-tight text-white/80 sm:block">
                    Global Robotics And
                    <br />
                    Automation Society
                  </span>
                </span>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${t.cls}`}>{t.label}</span>
              </div>
              <dl className="grid gap-4 p-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm text-ink2">{res.kind === "chapter" ? "Chapter" : "Name"}</dt>
                  <dd className="text-2xl font-semibold tracking-tight">{res.kind === "chapter" ? res.name : (res.organisation ?? res.name)}</dd>
                  {res.kind !== "chapter" && res.organisation && <dd className="text-ink2">Represented by {res.name}</dd>}
                  {res.masked && <dd className="text-sm text-ink2">Only initials are shown to protect a young member&apos;s privacy.</dd>}
                  {res.kind === "chapter" && <dd className="text-ink2">{res.members ?? 0} members</dd>}
                  {res.kind !== "chapter" && res.chapter && <dd className="text-ink2">Member of {res.chapter}</dd>}
                </div>
                <div>
                  <dt className="text-sm text-ink2">{res.kind === "chapter" ? "Chapter number" : "Member number"}</dt>
                  <dd className="readout font-medium">{res.member_no}</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink2">Membership</dt>
                  <dd className="font-medium">{res.plan}</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink2">Member since</dt>
                  <dd className="font-medium">{shortDate(res.member_since)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink2">Valid until</dt>
                  <dd className="font-medium">{res.valid_until ? shortDate(res.valid_until) : "No end date"}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
                <p className="text-sm text-ink2">{t.text} Checked against GRAAS records just now.</p>
                <a href={`/m/${res.member_no}`} className="btn btn-ghost !min-h-10">
                  Open the full record
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
