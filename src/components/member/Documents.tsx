"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/browser";
import { shortDate } from "@/lib/money";

/* Documents: the member's own resume (PDF or Word) and other certificates (PDF or image).
   Files are stored privately at member-docs/<user id>/<file>. The member chooses what shows on their public
   profile, which resume companies they apply to can open, and can ask GRAAS to verify a certificate. */

const sb = () => browserClient();
const MAX = 5 * 1024 * 1024;
const KINDS: Record<string, { label: string; accept: string; hint: string }> = {
  certificate: { label: "Certificate", accept: ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp", hint: "PDF or image (JPG, PNG), up to 5 MB" },
  resume: { label: "Resume", accept: ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document", hint: "PDF or Word, up to 5 MB" },
  other: { label: "Other document", accept: ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp", hint: "For example an internship letter or a mark sheet. PDF or image, up to 5 MB" },
};
const STATUS: Record<string, { text: string; cls: string }> = {
  verified: { text: "Verified by GRAAS", cls: "bg-go-soft text-go-deep" },
  requested: { text: "GRAAS is checking", cls: "bg-[#fff6e5] text-[#7a4b00]" },
  rejected: { text: "Sent back", cls: "bg-[#fff1ef] text-[#8f1a11]" },
  none: { text: "Not checked", cls: "bg-mist text-ink2" },
};
const size = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const extOf = (name: string) => (name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "pdf";

function FileIcon({ mime }: { mime: string }) {
  const img = mime.startsWith("image/");
  const word = mime.includes("word");
  return (
    <span className={`flex h-12 w-10 shrink-0 items-end justify-center rounded-lg pb-1.5 text-[0.65rem] font-bold tracking-wide text-white ${img ? "bg-[#0f6e78]" : word ? "bg-[#2c3e8f]" : "bg-[#8f1a11]"}`} aria-hidden="true">
      {img ? "IMG" : word ? "DOC" : "PDF"}
    </span>
  );
}

function Switch({ on, set, label, disabled }: { on: boolean; set: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2.5 text-sm ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <input type="checkbox" className="peer sr-only" checked={on} disabled={disabled} onChange={(e) => set(e.target.checked)} />
      <span className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ink ${on ? "bg-go" : "bg-line"}`} aria-hidden="true">
        <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : ""}`} />
      </span>
      {label}
    </label>
  );
}

function Upload({ userId, onDone }: { userId: string; onDone: (msg: string) => void }) {
  const [kind, setKind] = useState("certificate");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const pick = (f: File | null | undefined) => {
    setErr("");
    if (!f) return;
    if (f.size > MAX) return setErr("That file is larger than 5 MB. Save a smaller copy (for example, print it to PDF) and try again.");
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 120));
  };
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setErr("Choose a file first.");
    setBusy(true);
    setErr("");
    const path = `${userId}/${crypto.randomUUID()}.${extOf(file.name)}`;
    const up = await sb().storage.from("member-docs").upload(path, file, { upsert: false, contentType: file.type || undefined, cacheControl: "3600" });
    if (up.error) {
      setBusy(false);
      return setErr(/mime|type/i.test(up.error.message) ? "This file type is not accepted. Use PDF, Word (for resumes) or an image." : /size|large/i.test(up.error.message) ? "Files can be up to 5 MB." : "The upload did not finish. Check your internet and try again.");
    }
    const { data } = await sb().rpc("member_doc_add", { p: { path, kind, title, issuer, issued_on: date || null, file_name: file.name } });
    setBusy(false);
    if (!data?.ok) {
      await sb().storage.from("member-docs").remove([path]);
      return setErr(data?.error ?? "The document could not be saved.");
    }
    setFile(null);
    setTitle("");
    setIssuer("");
    setDate("");
    if (input.current) input.current.value = "";
    onDone(kind === "resume" ? "Resume uploaded. Switch on “Share with companies” to let companies you apply to open it." : "Uploaded. Ask GRAAS to verify it to get the Verified badge.");
  }
  const k = KINDS[kind];
  return (
    <form onSubmit={send} className="card grid gap-4 p-5 sm:p-6">
      <div>
        <h3 className="h-card">Add a document</h3>
        <p className="text-sm text-ink2">Your files stay private. You decide what appears on your public profile.</p>
      </div>
      <div role="radiogroup" aria-label="Kind of document" className="flex flex-wrap gap-2">
        {Object.entries(KINDS).map(([id, v]) => (
          <button key={id} type="button" role="radio" aria-checked={kind === id} onClick={() => setKind(id)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${kind === id ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`}>
            {v.label}
          </button>
        ))}
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={`grid place-items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors ${drag ? "border-go bg-go-soft" : "border-line bg-mist"}`}
      >
        {file ? (
          <p className="font-semibold">
            {file.name} <span className="font-normal text-ink2">({size(file.size)})</span>
          </p>
        ) : (
          <p className="font-semibold">Drop a file here, or</p>
        )}
        <label className="btn btn-ghost !min-h-10 cursor-pointer">
          {file ? "Choose another file" : "Choose a file"}
          <input ref={input} type="file" className="sr-only" accept={k.accept} onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        <p className="text-xs text-ink2">{k.hint}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-1.5 text-[0.95rem] font-medium sm:col-span-2 xl:col-span-1">
          Name of the document
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={kind === "resume" ? "Resume, November 2026" : "PLC programming, Level 1"} required />
        </label>
        {kind !== "resume" && (
          <>
            <label className="grid gap-1.5 text-[0.95rem] font-medium">
              Issued by
              <input className="field" value={issuer} onChange={(e) => setIssuer(e.target.value)} maxLength={120} placeholder="Siemens, NPTEL, college name…" />
            </label>
            <label className="grid gap-1.5 text-[0.95rem] font-medium">
              Date issued
              <input className="field" type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
            </label>
          </>
        )}
      </div>
      {err && (
        <p role="alert" className="font-semibold text-[#8f1a11]">
          {err}
        </p>
      )}
      <button className="btn btn-primary justify-self-start" disabled={busy || !file}>
        {busy ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}

function DocRow({ d, publicOn, reload, say }: { d: any; publicOn: boolean; reload: () => void; say: (tone: "good" | "bad", t: string) => void }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ title: d.title ?? "", issuer: d.issuer ?? "", issued_on: d.issued_on ?? "" });
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const st = STATUS[d.verify_status] ?? STATUS.none;
  async function rpc(name: string, args: any, ok?: string) {
    setBusy(true);
    const { data, error } = await sb().rpc(name, args);
    setBusy(false);
    if (error || !data?.ok) {
      say("bad", data?.error ?? "That did not work. Please try again.");
      return false;
    }
    if (ok) say("good", ok);
    reload();
    return true;
  }
  async function open() {
    const { data } = await sb().storage.from("member-docs").createSignedUrl(d.path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    else say("bad", "The file could not be opened. Please try again.");
  }
  async function remove() {
    setBusy(true);
    const { error } = await sb().storage.from("member-docs").remove([d.path]);
    setBusy(false);
    if (error) return say("bad", "The file could not be removed. Please try again.");
    rpc("member_doc_remove", { p_id: d.id }, "Document removed.");
  }
  return (
    <li className="rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start gap-4">
        <FileIcon mime={d.mime} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{d.title}</p>
          <p className="text-sm text-ink2">{[d.kind === "resume" ? "Resume" : d.kind === "other" ? "Document" : "Certificate", d.issuer, d.issued_on ? shortDate(d.issued_on) : null, size(d.size_bytes)].filter(Boolean).join(" · ")}</p>
          {d.kind !== "resume" && (
            <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
              {d.verify_status === "verified" && (
                <svg width="11" height="11" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M2.5 7.5 5.8 10.5 11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {st.text}
            </span>
          )}
          {d.verify_status === "rejected" && d.verify_note && <p className="mt-1.5 rounded-lg bg-[#fff1ef] px-3 py-2 text-sm text-[#8f1a11]">GRAAS says: {d.verify_note}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost !min-h-9 !px-3 !py-1 text-sm" onClick={open}>
            Open
          </button>
          <button type="button" className="btn btn-ghost !min-h-9 !px-3 !py-1 text-sm" onClick={() => setEdit((v) => !v)}>
            {edit ? "Close" : "Edit"}
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-3">
        <Switch on={!!d.show_public} disabled={busy} set={(v) => rpc("member_doc_update", { p_id: d.id, p: { show_public: v } }, v ? (publicOn ? "Now shown on your public profile." : "Saved. It will show once you make your profile public.") : "Hidden from your public profile.")} label="Show on my public profile" />
        {d.kind === "resume" && <Switch on={!!d.share_with_companies} disabled={busy} set={(v) => rpc("member_doc_update", { p_id: d.id, p: { share_with_companies: v } }, v ? "Companies you apply to can now open this resume." : "Companies can no longer open this resume.")} label="Share with companies I apply to" />}
        {d.kind !== "resume" && (d.verify_status === "none" || d.verify_status === "rejected") && (
          <button type="button" className="text-sm font-semibold text-go-deep underline decoration-go decoration-2 underline-offset-4" disabled={busy} onClick={() => rpc("member_doc_request_verify", { p_id: d.id }, "Sent to GRAAS. You will get an email when it is checked.")}>
            Ask GRAAS to verify
          </button>
        )}
        <span className="ml-auto">
          {ask ? (
            <span className="flex items-center gap-2 text-sm font-semibold">
              Remove for good?
              <button type="button" className="btn btn-ghost !min-h-8 !px-3 !py-0.5 text-sm" onClick={remove} disabled={busy}>
                Yes, remove
              </button>
              <button type="button" className="btn btn-ghost !min-h-8 !px-3 !py-0.5 text-sm" onClick={() => setAsk(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button type="button" className="text-sm font-semibold text-ink2 hover:text-[#8f1a11]" onClick={() => setAsk(true)}>
              Remove
            </button>
          )}
        </span>
      </div>
      {edit && (
        <div className="mt-3 grid gap-3 rounded-xl bg-mist p-4 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium">
            Name
            <input className="field !min-h-10" value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </label>
          {d.kind !== "resume" && (
            <>
              <label className="grid gap-1 text-sm font-medium">
                Issued by
                <input className="field !min-h-10" value={f.issuer} maxLength={120} onChange={(e) => setF({ ...f, issuer: e.target.value })} />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Date issued
                <input className="field !min-h-10" type="date" value={f.issued_on ?? ""} onChange={(e) => setF({ ...f, issued_on: e.target.value })} />
              </label>
            </>
          )}
          {d.verify_status === "verified" && <p className="text-xs text-ink2 sm:col-span-3">Changing the name, issuer or date removes the Verified badge until GRAAS checks it again.</p>}
          <button type="button" className="btn btn-primary !min-h-10 justify-self-start" disabled={busy} onClick={() => rpc("member_doc_update", { p_id: d.id, p: { title: f.title, issuer: f.issuer, issued_on: f.issued_on || null } }, "Saved.").then((ok) => ok && setEdit(false))}>
            Save changes
          </button>
        </div>
      )}
    </li>
  );
}

export default function Documents({ a, goPublic }: { a: any; goPublic?: () => void }) {
  const [docs, setDocs] = useState<any[] | null>(null);
  const [pub, setPub] = useState<any>(null);
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    const [d, p] = await Promise.all([sb().rpc("my_documents"), sb().rpc("my_public")]);
    if (d.error) setFailed(true);
    setDocs(Array.isArray(d.data) ? d.data : []);
    setPub(p.data ?? null);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const say = (tone: "good" | "bad", text: string) => setMsg({ tone, text });
  if (docs === null) return <div className="card p-8 text-ink2">Loading your documents…</div>;
  const verified = docs.filter((d) => d.verify_status === "verified").length;
  const checking = docs.filter((d) => d.verify_status === "requested").length;
  const resumes = docs.filter((d) => d.kind === "resume");
  const others = docs.filter((d) => d.kind !== "resume");
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid content-start gap-5">
        {failed && <p className="card p-5 font-medium">Documents could not be loaded just now. Please refresh the page in a minute.</p>}
        <Upload
          userId={a.profile.id}
          onDone={(t) => {
            say("good", t);
            load();
          }}
        />
        {msg && (
          <p role="status" className={`rounded-2xl px-4 py-3 font-medium ${msg.tone === "good" ? "bg-go-soft text-go-deep" : "bg-[#fff1ef] text-[#8f1a11]"}`}>
            {msg.text}
          </p>
        )}
        <section className="card p-5 sm:p-6">
          <h3 className="h-card">Resumes</h3>
          {resumes.length === 0 ? (
            <p className="mt-2 text-ink2">No resume uploaded. You can also build one in the Resume tab.</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {resumes.map((d) => (
                <DocRow key={d.id + d.updated_at} d={d} publicOn={!!pub?.is_public_now} reload={load} say={say} />
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5 sm:p-6">
          <h3 className="h-card">Certificates and other documents</h3>
          {others.length === 0 ? (
            <p className="mt-2 text-ink2">Nothing yet. Upload course, internship, competition and workshop certificates, then ask GRAAS to verify them.</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {others.map((d) => (
                <DocRow key={d.id + d.verify_status + d.show_public} d={d} publicOn={!!pub?.is_public_now} reload={load} say={say} />
              ))}
            </ul>
          )}
        </section>
      </div>
      <aside className="grid content-start gap-4 xl:sticky xl:top-24 xl:self-start">
        <div className="card grid gap-3 p-5">
          <p className="text-sm font-semibold text-ink2">Your documents</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-mist p-3">
              <p className="readout text-2xl font-semibold">{docs.length}</p>
              <p className="text-xs text-ink2">of 20</p>
            </div>
            <div className="rounded-xl bg-go-soft p-3">
              <p className="readout text-2xl font-semibold text-go-deep">{verified}</p>
              <p className="text-xs text-go-deep">verified</p>
            </div>
            <div className="rounded-xl bg-[#fff6e5] p-3">
              <p className="readout text-2xl font-semibold text-[#7a4b00]">{checking}</p>
              <p className="text-xs text-[#7a4b00]">checking</p>
            </div>
          </div>
        </div>
        <div className="card grid gap-2 p-5 text-sm">
          <p className="font-semibold">How verification works</p>
          <ol className="grid list-decimal gap-1.5 pl-5 text-ink2">
            <li>Upload a clear copy and fill in who issued it.</li>
            <li>Press Ask GRAAS to verify. GRAAS checks it with the issuer where needed.</li>
            <li>Verified certificates get a green badge on your profile, resume and public page.</li>
          </ol>
        </div>
        <div className="card grid gap-2 p-5 text-sm">
          <p className="font-semibold">Public profile</p>
          <p className="text-ink2">{pub?.is_public_now ? "Your profile is public, so documents you switch on appear there." : "Your profile is private. Documents marked to show will appear once you make it public."}</p>
          {goPublic && (
            <button type="button" className="btn btn-ghost !min-h-10 justify-self-start" onClick={goPublic}>
              Profile settings
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
