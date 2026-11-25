"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { shortDate } from "@/lib/money";
import { Badge, Msg, lbl, sb, small, type Tone } from "./shared";

/* Documents members upload: certificates waiting for a GRAAS check, and every member's files for the
   membership desk. Verifying gives the certificate a "Verified by GRAAS" badge on the member's profile,
   resume and public page; sending it back emails the member the note. */

const FILTERS: [string, string][] = [
  ["requested", "Waiting for a check"],
  ["verified", "Verified"],
  ["rejected", "Sent back"],
  ["none", "Not asked"],
  ["all", "All documents"],
];
const TONE: Record<string, Tone> = { requested: "warn", verified: "good", rejected: "bad", none: "plain" };
const TEXT: Record<string, string> = { requested: "Waiting", verified: "Verified", rejected: "Sent back", none: "Not asked" };
const size = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function Row({ d, onDone }: { d: any; onDone: (t: string) => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  async function act(action: "verify" | "reject" | "reset") {
    setBusy(true);
    setErr("");
    const { data, error } = await sb().rpc("staff_doc_action", { p_id: d.id, p_action: action, p_note: note.trim() || null });
    setBusy(false);
    if (error || !data?.ok) return setErr(data?.error ?? error?.message ?? "That did not work.");
    onDone(action === "verify" ? `${d.title} is verified. ${d.name} gets an email.` : action === "reject" ? `${d.title} sent back to ${d.name} with your note.` : "Check cleared.");
  }
  async function view(inline: boolean) {
    const { data } = await sb().storage.from("member-docs").createSignedUrl(d.path, 600);
    if (!data?.signedUrl) return setErr("The file could not be opened.");
    if (inline && (d.mime.startsWith("image/") || d.mime === "application/pdf")) setPreview(data.signedUrl);
    else window.open(data.signedUrl, "_blank", "noopener");
  }
  return (
    <li className="plate grid gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold">{d.title}</p>
          <p className="text-sm text-ink2">{[d.kind === "resume" ? "Resume" : d.kind === "other" ? "Other document" : "Certificate", d.issuer ? `issued by ${d.issuer}` : "issuer not given", d.issued_on ? shortDate(d.issued_on) : null, size(d.size_bytes)].filter(Boolean).join(" · ")}</p>
          <p className="mt-1 text-sm">
            <span className="font-semibold">{d.name}</span>
            {d.member_no && (
              <>
                , <a className="readout underline" href={`/m/${d.member_no}`} target="_blank" rel="noreferrer">{d.member_no}</a>
              </>
            )}
            <span className="text-ink2">, {d.email}</span>
          </p>
        </div>
        <span className="flex flex-col items-end gap-1">
          <Badge tone={TONE[d.verify_status] ?? "plain"}>{TEXT[d.verify_status] ?? d.verify_status}</Badge>
          <span className="text-xs text-ink2">{d.requested_at ? `Asked ${shortDate(d.requested_at)}` : `Uploaded ${shortDate(d.created_at)}`}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={small} onClick={() => view(true)}>
          Look at it here
        </button>
        <button type="button" className={small} onClick={() => view(false)}>
          Open in a new tab
        </button>
        {d.show_public && <Badge tone="plain">Shown on public profile</Badge>}
        {d.share_with_companies && <Badge tone="plain">Shared with companies</Badge>}
      </div>
      {preview && (
        <div className="overflow-hidden rounded-xl border border-line bg-mist">
          {d.mime.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={d.title} className="mx-auto max-h-[70vh] w-auto" />
          ) : (
            <iframe src={preview} title={d.title} className="h-[70vh] w-full" />
          )}
        </div>
      )}
      {d.verify_note && d.verify_status !== "requested" && <p className="rounded-xl bg-mist px-4 py-2.5 text-sm">Note: {d.verify_note}</p>}
      {d.kind !== "resume" && (
        <div className="grid gap-3 border-t border-line pt-4">
          <label className={lbl}>
            Note {d.verify_status === "requested" ? <span className="font-normal text-ink2">(needed to send it back; optional when verifying)</span> : null}
            <textarea className="field min-h-16" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="For example: checked with the issuer by email on 26 Nov" />
          </label>
          <div className="flex flex-wrap gap-2">
            {d.verify_status !== "verified" && (
              <button type="button" className="btn btn-go !min-h-10 !py-2" onClick={() => act("verify")} disabled={busy}>
                Verify
              </button>
            )}
            {d.verify_status !== "rejected" && (
              <button type="button" className="btn btn-quiet !min-h-10 !py-2" onClick={() => act("reject")} disabled={busy}>
                Send back with the note
              </button>
            )}
            {d.verify_status === "verified" && (
              <button type="button" className="btn btn-quiet !min-h-10 !py-2" onClick={() => act("reset")} disabled={busy}>
                Remove the verified badge
              </button>
            )}
          </div>
        </div>
      )}
      {err && <Msg tone="bad">{err}</Msg>}
    </li>
  );
}

export function Documents() {
  const [status, setStatus] = useState("requested");
  const [q, setQ] = useState("");
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const { data: r, error } = await sb().rpc("staff_documents", { p_status: status, p_search: q.trim() || null });
    setData(error ? { ok: false, error: error.message } : r);
  }, [status, q]);
  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  const counts = data?.counts ?? {};
  const all = Object.values(counts).reduce((a: number, b: any) => a + Number(b), 0) as number;
  return (
    <div className="grid gap-5">
      <p className="max-w-3xl text-ink2">Members upload their resumes and certificates in their account and can ask GRAAS to verify a certificate. Check it (with the issuer if needed), then verify it or send it back with a note. Members are emailed either way. Resumes are not verified.</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setStatus(id)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${status === id ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"}`}>
              {label} <span className="readout opacity-70">{id === "all" ? all : (counts[id] ?? 0)}</span>
            </button>
          ))}
        </div>
        <label className={`${lbl} ml-auto min-w-64`}>
          Search
          <input className="field !min-h-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, member number or title" />
        </label>
      </div>
      {msg && <Msg tone="good">{msg}</Msg>}
      {!data ? (
        <p className="text-ink2">Loading…</p>
      ) : !data.ok ? (
        <Msg tone="bad">{data.error ?? "Could not load documents."}</Msg>
      ) : data.items.length === 0 ? (
        <p className="plate p-6 text-ink2">{status === "requested" ? "No certificates are waiting for a check." : "Nothing here."}</p>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {data.items.map((d: any) => (
            <Row
              key={d.id + d.verify_status}
              d={d}
              onDone={(t) => {
                setMsg(t);
                load();
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
