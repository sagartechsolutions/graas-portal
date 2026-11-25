"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { phoneText, phoneHref } from "@/lib/format";
import { useCallback, useEffect, useState } from "react";
import ProfileView from "@/components/member/ProfileView";
import { browserClient } from "@/lib/browser";
import { shortDate } from "@/lib/money";
import { Modal } from "./MemberOpps";
import { APP_STATUS, OPP_STATUS, OppCard } from "./OppBits";
import OppForm from "./OppForm";

/* For Industry and Institution members (and GRAAS staff for its own posts): post opportunities, review
   applicants, see the top 5 matching members and invite them. Contact details appear only after both accept. */

function Applicant({ x, onAct, school }: { x: any; onAct: (id: string, action: string, note?: string) => Promise<void>; school: boolean }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(x.company_note ?? "");
  const c = x.card;
  const done = ["withdrawn", "declined"].includes(x.status);
  return (
    <li className="rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-4 p-4">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold">{c.full_name}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${APP_STATUS[x.status]?.tone}`}>{APP_STATUS[x.status]?.label}</span>
            {x.connected && <span className="rounded-full bg-go px-2.5 py-0.5 text-xs font-semibold text-white">Connected</span>}
            {x.score >= 10 && <span className="rounded-full bg-go-soft px-2.5 py-0.5 text-xs font-semibold text-go-deep">Match {x.score}</span>}
          </p>
          <p className="text-sm text-ink2">{[c.mp?.headline, c.organisation, c.city].filter(Boolean).join(" · ")}</p>
          <p className="text-xs text-ink2">
            {x.source === "invited" ? "Invited" : "Applied"} {shortDate(x.created_at)}
          </p>
        </div>
        <button type="button" className="btn btn-ghost !min-h-10" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide profile" : "View profile"}
        </button>
      </div>
      {x.note && <p className="mx-4 mb-3 rounded-xl bg-mist px-4 py-3 text-sm"><b className="font-semibold">Their note:</b> {x.note}</p>}
      {x.connected && x.contact ? (
        <p className="mx-4 mb-3 rounded-xl bg-go-soft px-4 py-3 text-sm">
          <b className="font-semibold text-go-deep">Contact:</b>{" "}
          <a className="font-semibold underline" href={`mailto:${x.contact.email}`}>
            {x.contact.email}
          </a>
          {x.contact.phone && (
            <>
              {" · "}
              <a className="font-semibold underline" href={phoneHref(x.contact.phone)}>
                {phoneText(x.contact.phone)}
              </a>
            </>
          )}
        </p>
      ) : (
        !done && (
          <p className="mx-4 mb-3 text-sm text-ink2">
            {school ? "School student: GRAAS puts you in touch through the school." : x.status === "invited" ? "Waiting for them to accept your invitation." : x.company_ok ? "You accepted. Waiting for the member." : "Accept to see their mobile number and email. They see yours too."}
          </p>
        )
      )}
      {open && (
        <div className="border-t border-line p-4">
          <ProfileView p={c} mp={c.mp ?? {}} plan={c.plan} />
        </div>
      )}
      {!done && x.status !== "invited" && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line p-4">
          {!x.company_ok && !school && (
            <button type="button" className="btn btn-primary !min-h-10" onClick={() => onAct(x.id, "accept")}>
              Accept and connect
            </button>
          )}
          {[
            ["shortlist", "Shortlist"],
            ["interview", "Interview"],
            ["select", "Selected"],
            ["reject", "Not now"],
          ].map(([k, l]) => (
            <button key={k} type="button" className="rounded-full border border-line px-3.5 py-2 text-sm font-semibold hover:border-ink" onClick={() => onAct(x.id, k)}>
              {l}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-2">
            <input className="field !min-h-10 !py-1.5 text-sm" placeholder="Private note" value={note} maxLength={600} onChange={(e) => setNote(e.target.value)} />
            <button type="button" className="whitespace-nowrap text-sm font-semibold underline" onClick={() => onAct(x.id, "note", note)}>
              Save note
            </button>
          </span>
        </div>
      )}
    </li>
  );
}

export function PostDetail({ o, onClose }: { o: any; onClose: () => void }) {
  const [tab, setTab] = useState<"applicants" | "matches">("applicants");
  const [list, setList] = useState<any[] | null>(null);
  const [matches, setMatches] = useState<any[] | null>(null);
  const [msg, setMsg] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const load = useCallback(async () => {
    const sb = browserClient();
    const [a, m] = await Promise.all([sb.rpc("org_applicants", { p_opp: o.id }), o.status === "approved" ? sb.rpc("org_matches", { p_opp: o.id }) : Promise.resolve({ data: [] })]);
    setList((a.data as any[]) ?? []);
    setMatches((m.data as any[]) ?? []);
  }, [o.id, o.status]);
  useEffect(() => {
    load();
  }, [load]);
  const school = (o.audience ?? []).length === 1 && o.audience[0] === "school";
  async function act(id: string, action: string, note?: string) {
    const { data } = await browserClient().rpc("org_application_action", { p_id: id, p_action: action, p_note: note ?? null });
    setMsg(data?.ok ? (action === "accept" ? (data.connected ? "Connected. You can now see each other's contact details." : "Accepted. Contact details appear when the member confirms.") : action === "note" ? "Note saved." : "Updated. The member gets an email.") : data?.error ?? "Could not do that.");
    load();
  }
  async function invite(user: string) {
    const { data } = await browserClient().rpc("org_invite", { p_opp: o.id, p_user: user, p_message: inviteMsg || null });
    setMsg(data?.ok ? "Invitation sent. If they accept, you both see each other's contact details." : data?.error ?? "Could not send the invitation.");
    load();
  }
  return (
    <Modal onClose={onClose} wide>
      <p className="text-sm font-semibold text-go-deep">
        {o.kind_label} · {o.ref}
      </p>
      <h2 className="text-2xl font-semibold tracking-tight">{o.title}</h2>
      <div className="mt-5 inline-flex rounded-full bg-mist p-1">
        {(
          [
            ["applicants", `Applicants (${list?.filter((x) => !["invited"].includes(x.status)).length ?? "…"})`],
            ["matches", "Top 5 matches"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === k ? "bg-ink text-white" : "text-ink2"}`}>
            {l}
          </button>
        ))}
      </div>
      {msg && <p className="mt-4 rounded-xl bg-go-soft px-4 py-3 font-medium text-go-deep">{msg}</p>}
      {tab === "applicants" ? (
        !list ? (
          <p className="mt-6 text-ink2">Loading…</p>
        ) : list.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-mist p-6 text-ink2">No applicants yet. Look at the top matches and invite the people you like.</p>
        ) : (
          <ul className="mt-5 grid gap-3">
            {list.map((x) => (
              <Applicant key={x.id} x={x} onAct={act} school={school} />
            ))}
          </ul>
        )
      ) : o.status !== "approved" ? (
        <p className="mt-6 rounded-2xl bg-mist p-6 text-ink2">Matches appear once the opportunity is live.</p>
      ) : !matches ? (
        <p className="mt-6 text-ink2">Loading…</p>
      ) : matches.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-mist p-6 text-ink2">No member matches the skills on this post yet. Add more skills to the post, or check again in a few days.</p>
      ) : (
        <div className="mt-5 grid gap-4">
          <p className="text-sm text-ink2">GRAAS suggests up to five members whose skills, branch and interests fit this post, and who allow companies to find them. Names and profiles only: contact details appear when they accept your invitation.</p>
          <label className="grid gap-1.5 text-sm font-medium">
            Message with your invitation (optional)
            <input className="field" maxLength={800} value={inviteMsg} onChange={(e) => setInviteMsg(e.target.value)} placeholder="We liked your PLC project. Would you like to apply?" />
          </label>
          {matches.map((m) => (
            <div key={m.card.id} className="grid gap-3">
              <ProfileView p={m.card} mp={m.card.mp ?? {}} plan={m.card.plan} note={<p className="rounded-xl bg-go-soft px-4 py-2 text-sm font-semibold text-go-deep">Match score {m.score}</p>} />
              <button type="button" className="btn btn-primary justify-self-start" onClick={() => invite(m.card.id)}>
                Invite {String(m.card.full_name).split(" ")[0]}
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default function OrgOpps() {
  const [d, setD] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [flash, setFlash] = useState("");
  const load = useCallback(async () => {
    const { data } = await browserClient().rpc("org_opportunities");
    setD(data ?? { items: [] });
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function act(o: any, action: string) {
    const { data } = await browserClient().rpc("org_opportunity_action", { p_id: o.id, p_action: action });
    setFlash(data?.ok ? "Updated." : data?.error ?? "Could not do that.");
    load();
  }
  if (!d) return <div className="card p-8 text-ink2">Loading…</div>;
  if (form) return <OppForm initial={form === "new" ? undefined : form} onCancel={() => setForm(null)} onDone={(m) => { setForm(null); setFlash(m); load(); }} />;
  const total = d.items.reduce((n: number, o: any) => n + Number(o.applicants), 0);
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="h-card !text-2xl">Opportunities</h2>
          <p className="text-ink2">Post jobs, internships, projects, problem statements and challenges. GRAAS approves each post, then shows it to matching members and suggests the top 5 profiles.</p>
        </div>
        {d.can_post && (
          <button type="button" className="btn btn-primary" onClick={() => setForm("new")}>
            Post an opportunity
          </button>
        )}
      </div>
      {!d.can_post && <p className="rounded-xl bg-[#fff6e5] px-4 py-3 text-[#7a4b00]">Posting opens once your Industry or Institution membership is active.</p>}
      {flash && <p className="rounded-xl bg-go-soft px-4 py-3 font-medium text-go-deep">{flash}</p>}
      {d.items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Live posts", d.items.filter((o: any) => o.status === "approved").length],
            ["Applicants", total],
            ["Connected", d.items.reduce((n: number, o: any) => n + Number(o.connected), 0)],
          ].map(([k, v]) => (
            <div key={k as string} className="card p-5">
              <p className="text-sm text-ink2">{k}</p>
              <p className="readout mt-1 text-3xl font-semibold">{v}</p>
            </div>
          ))}
        </div>
      )}
      {d.items.length === 0 ? (
        <div className="card p-8 text-center text-ink2">No posts yet. Your first post goes to GRAAS for a quick check, then to members.</div>
      ) : (
        <ul className="grid gap-3">
          {d.items.map((o: any) => (
            <li key={o.id} className="grid gap-2">
              <OppCard
                o={o}
                onOpen={() => setDetail(o)}
                badge={<span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${OPP_STATUS[o.status]?.tone}`}>{OPP_STATUS[o.status]?.label}</span>}
              />
              {o.status === "rejected" && o.staff_note && <p className="rounded-xl bg-[#fff1ef] px-4 py-3 text-sm text-[#8f1a11]"><b>GRAAS:</b> {o.staff_note}</p>}
              <div className="flex flex-wrap items-center gap-2 px-1 text-sm">
                <span className="text-ink2">
                  {o.applicants} applicants{Number(o.new) ? `, ${o.new} new` : ""}, {o.connected} connected{Number(o.invited) ? `, ${o.invited} invited` : ""}
                </span>
                <span className="ml-auto flex flex-wrap gap-2">
                  <button type="button" className="btn btn-ghost !min-h-9 !py-1.5" onClick={() => setDetail(o)}>
                    Applicants and matches
                  </button>
                  {!["closed", "removed"].includes(o.status) && (
                    <button type="button" className="btn btn-ghost !min-h-9 !py-1.5" onClick={() => setForm(o)}>
                      Edit
                    </button>
                  )}
                  {o.status === "approved" && (
                    <button type="button" className="btn btn-ghost !min-h-9 !py-1.5" onClick={() => act(o, "pause")}>
                      Pause
                    </button>
                  )}
                  {o.status === "paused" && (
                    <button type="button" className="btn btn-ghost !min-h-9 !py-1.5" onClick={() => act(o, "resume")}>
                      Resume
                    </button>
                  )}
                  {["draft", "rejected"].includes(o.status) && (
                    <button type="button" className="btn btn-ghost !min-h-9 !py-1.5" onClick={() => act(o, "submit")}>
                      Send to GRAAS
                    </button>
                  )}
                  {!["closed", "removed"].includes(o.status) && (
                    <button type="button" className="btn btn-ghost !min-h-9 !py-1.5" onClick={() => confirm("Close this opportunity? Members can no longer apply.") && act(o, "close")}>
                      Close
                    </button>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {detail && <PostDetail o={detail} onClose={() => { setDetail(null); load(); }} />}
    </div>
  );
}
