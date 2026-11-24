"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LogoMark } from "@/components/site/Logo";
import { browserClient } from "@/lib/browser";
import { shortDate } from "@/lib/money";

type Result = { found: boolean; member_no?: string; name?: string; plan?: string; organisation?: string | null; state?: string; member_since?: string; valid_until?: string | null };
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
        <h1 className="h-section">Verify a member</h1>
        <p className="mt-3 text-ink2">Scan the QR code on a GRAAS member ID, or type the member number printed on it.</p>
        <form
          className="mt-8 flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            check(no);
          }}
        >
          <input className="field readout min-w-0 flex-1 uppercase" placeholder="GRAAS-26S-00001" value={no} onChange={(e) => setNo(e.target.value)} aria-label="Member number" />
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Checking…" : "Check"}
          </button>
        </form>
        <div aria-live="polite">
          {res && !res.found && <p className="card mt-8 p-6 font-medium">No member has this number. Check the number and try again.</p>}
          {res?.found && t && (
            <div className="card mt-8 overflow-hidden shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-4 bg-ink p-6 text-white">
                <LogoMark size={44} tone="light" />
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${t.cls}`}>{t.label}</span>
              </div>
              <dl className="grid gap-4 p-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm text-ink2">Name</dt>
                  <dd className="text-2xl font-semibold tracking-tight">{res.organisation ?? res.name}</dd>
                  {res.organisation && <dd className="text-ink2">Represented by {res.name}</dd>}
                </div>
                <div>
                  <dt className="text-sm text-ink2">Member number</dt>
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
              <p className="border-t border-line px-6 py-4 text-sm text-ink2">{t.text} Checked against GRAAS records just now.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
