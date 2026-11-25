"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { phoneText } from "@/lib/format";
import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OPP_STATUS, OppBody } from "@/components/opps/OppBits";
import OppForm from "@/components/opps/OppForm";
import { PostDetail } from "@/components/opps/OrgOpps";
import { shortDate } from "@/lib/money";
import { Badge, downloadCsv, Msg, refreshSite, sb, small, type Tone } from "./shared";

const TONE: Record<string, Tone> = { pending: "warn", approved: "good", rejected: "bad", paused: "plain", closed: "plain", removed: "bad", draft: "plain" };
const TABS = [
  ["pending", "To check"],
  ["approved", "Live"],
  ["paused", "Paused"],
  ["rejected", "Sent back"],
  ["closed", "Closed"],
  ["removed", "Removed"],
  ["all", "All"],
] as const;

/** Moderation of opportunities, posting for GRAAS or on behalf of a company, and applicants for GRAAS's own posts. */
export function Opportunities({ session }: { session: Session }) {
  const [list, setList] = useState<any[] | null>(null);
  const [tab, setTab] = useState<string>("pending");
  const [open, setOpen] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [people, setPeople] = useState<any>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ tone: Tone; text: string } | null>(null);
  const load = useCallback(async () => {
    const { data } = await sb().rpc("staff_opportunities");
    setList((data as any[]) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const shown = useMemo(() => (list ?? []).filter((o) => tab === "all" || o.status === tab), [list, tab]);
  async function act(o: any, action: string) {
    const { data } = await sb().rpc("staff_opportunity_action", { p_id: o.id, p_action: action, p_note: note || null });
    if (!data?.ok) return setMsg({ tone: "bad", text: data?.error ?? "Could not do that." });
    setMsg({ tone: "good", text: `${o.title}: ${OPP_STATUS[data.status]?.label ?? data.status}.${o.poster_id && ["approve", "reject", "remove"].includes(action) ? " The organisation gets an email." : ""}` });
    setNote("");
    setOpen(null);
    await refreshSite(session);
    load();
  }
  if (form)
    return (
      <OppForm
        staff
        initial={form === "new" ? { org_name: "GRAAS" } : form}
        onCancel={() => setForm(null)}
        onDone={async (m) => {
          setForm(null);
          setMsg({ tone: "good", text: m });
          await refreshSite(session);
          load();
        }}
      />
    );
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-ink2">Industry and Institution members post jobs, internships, projects, problem statements, challenges and trainings. Check each one: clear work, fair pay or prize, no fees asked from students, no phone numbers in the text. Approved posts appear on the website and in members&apos; accounts.</p>
        <div className="flex gap-2">
          <button type="button" className="btn-go" onClick={() => setForm("new")}>
            Post for GRAAS or a company
          </button>
          <button
            type="button"
            className="btn-quiet"
            onClick={() =>
              downloadCsv("graas-opportunities", [
                ["Reference", "Status", "Type", "Title", "Organisation", "Posted by", "Email", "Applicants", "Apply by", "Created"],
                ...(list ?? []).map((o) => [o.ref, o.status, o.kind_label, o.title, o.org_name, o.poster?.name, o.poster?.email, o.applicants, o.apply_by, o.created_at?.slice(0, 10)]),
              ])
            }
          >
            Download CSV
          </button>
        </div>
      </div>
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(([k, l]) => {
          const n = (list ?? []).filter((o) => k === "all" || o.status === k).length;
          return (
            <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${tab === k ? "bg-ink text-white" : "bg-white text-ink2 shadow-[var(--shadow-card)]"}`}>
              {l} {n ? `(${n})` : ""}
            </button>
          );
        })}
      </div>
      {!list ? (
        <p className="text-ink2">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="plate p-6 text-ink2">Nothing here.</p>
      ) : (
        <div className="plate overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line text-ink2">
              <tr>
                <th className="p-3">Opportunity</th>
                <th className="p-3">Organisation</th>
                <th className="p-3">Status</th>
                <th className="p-3">Applicants</th>
                <th className="p-3">Apply by</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0">
                  <td className="p-3">
                    <p className="font-semibold">{o.title}</p>
                    <p className="text-ink2">
                      {o.kind_label} · {o.ref}
                    </p>
                  </td>
                  <td className="p-3">
                    <p className="font-medium">{o.org_name}</p>
                    <p className="text-ink2">{o.poster ? `${o.poster.name}, ${o.poster.member_no ?? "member"}` : "Posted by GRAAS"}</p>
                  </td>
                  <td className="p-3">
                    <Badge tone={TONE[o.status]}>{OPP_STATUS[o.status]?.label}</Badge>
                  </td>
                  <td className="readout p-3">{o.applicants}</td>
                  <td className="p-3">{o.apply_by ? shortDate(o.apply_by) : "Open"}</td>
                  <td className="p-3 text-right">
                    <button type="button" className={small} onClick={() => { setOpen(o); setNote(""); }}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-ink/40" onClick={() => setOpen(null)}>
          <div className="h-full w-full max-w-3xl overflow-y-auto bg-white p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-go-deep">
                  {open.kind_label} · {open.ref}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight">{open.title}</h2>
                <p className="text-ink2">
                  {open.org_name}
                  {open.poster ? ` · ${open.poster.name}, ${open.poster.email}${open.poster.phone ? `, ${phoneText(open.poster.phone)}` : ""}` : " · Posted by GRAAS"}
                </p>
              </div>
              <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-xl" onClick={() => setOpen(null)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="mt-5 grid gap-3 rounded-2xl bg-mist p-4">
              <label className="grid gap-1 text-sm font-semibold">
                Note to the organisation (needed to send back)
                <textarea className="field min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: remove the phone number from the description, and add the stipend." />
              </label>
              <div className="flex flex-wrap gap-2">
                {open.status !== "approved" && open.status !== "removed" && open.status !== "closed" && (
                  <button type="button" className="btn-go" onClick={() => act(open, "approve")}>
                    Approve and publish
                  </button>
                )}
                {["pending", "approved", "paused"].includes(open.status) && (
                  <button type="button" className="btn-quiet" onClick={() => act(open, "reject")}>
                    Send back
                  </button>
                )}
                {open.status === "approved" && (
                  <button type="button" className="btn-quiet" onClick={() => act(open, "pause")}>
                    Pause
                  </button>
                )}
                {open.status === "paused" && (
                  <button type="button" className="btn-quiet" onClick={() => act(open, "resume")}>
                    Resume
                  </button>
                )}
                {["approved", "paused", "pending"].includes(open.status) && (
                  <button type="button" className="btn-quiet" onClick={() => act(open, "close")}>
                    Close
                  </button>
                )}
                {open.status === "closed" && (
                  <button type="button" className="btn-quiet" onClick={() => act(open, "reopen")}>
                    Reopen
                  </button>
                )}
                {open.status !== "removed" ? (
                  <button type="button" className="btn-quiet !text-[#8f1a11]" onClick={() => confirm("Remove this opportunity from the website and from members' accounts?") && act(open, "remove")}>
                    Remove
                  </button>
                ) : (
                  <button type="button" className="btn-quiet" onClick={() => act(open, "restore")}>
                    Restore for checking
                  </button>
                )}
                <button type="button" className="btn-quiet" onClick={() => { setForm(open); setOpen(null); }}>
                  Edit
                </button>
                <button type="button" className="btn-quiet" onClick={() => setPeople(open)}>
                  Applicants and matches
                </button>
              </div>
              {open.staff_note && <p className="text-sm text-ink2">Last note: {open.staff_note}</p>}
            </div>
            <div className="mt-6">
              <OppBody o={open} />
            </div>
          </div>
        </div>
      )}
      {people && <PostDetail o={people} onClose={() => setPeople(null)} />}
    </div>
  );
}
