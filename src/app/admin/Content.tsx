"use client";

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { browserClient } from "@/lib/browser";
import { longDate } from "@/lib/format";
import { photoSrc } from "@/lib/photos";

const sb = () => browserClient();
const CATEGORIES = ["Announcement", "Membership", "Chapters", "Learning", "Events", "Industry", "Conference"];
const SITE_PHOTOS = ["hero", "lab", "learn", "chapters", "compete", "industry", "assembly", "bluearm", "panel", "chip", "arduino", "rovers", "prototype", "chess", "printers", "drone", "hand", "engineer"];

async function refreshSite(session: Session) {
  await fetch("/api/revalidate", { method: "POST", headers: { authorization: `Bearer ${session.access_token}` } }).catch(() => {});
}

/** Shrinks a photo in the browser before upload, so phone pictures of 8 MB become about 400 KB. */
async function shrink(file: File, max = 1800): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * k), height = Math.round(bmp.height * k);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.86));
  if (!blob) throw new Error("This photo could not be read. Try a JPG or PNG file.");
  return { blob, width, height };
}

async function upload(file: File, folder: string) {
  const { blob, width, height } = await shrink(file);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await sb().storage.from("media").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw new Error(error.message);
  return { url: sb().storage.from("media").getPublicUrl(path).data.publicUrl, width, height };
}

const storagePath = (url: string) => {
  const i = url.indexOf("/object/public/media/");
  return i === -1 ? null : decodeURIComponent(url.slice(i + "/object/public/media/".length));
};

/* ---------- Updates ---------- */

type PostRow = { id: string; slug: string; title: string; summary: string | null; body: string | null; category: string; cover_url: string | null; is_published: boolean; published_at: string };
const blank = { id: "", slug: "", title: "", summary: "", body: "", category: "Announcement", cover_url: "", is_published: true };
type Draft = typeof blank;

function PostEditor({ draft, session, onDone }: { draft: Draft; session: Session; onDone: (saved: boolean) => void }) {
  const [d, setD] = useState<Draft>(draft);
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setState("Uploading photo…");
    try {
      const { url } = await upload(file, "updates");
      set("cover_url", url);
      setState("");
    } catch (x) {
      setState((x as Error).message);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!d.title.trim()) return setState("Give the update a title.");
    setBusy(true);
    setState("Saving…");
    const row = { title: d.title.trim(), summary: d.summary.trim() || null, body: d.body.trim() || null, category: d.category, cover_url: d.cover_url || null, is_published: d.is_published, updated_by: session.user.id };
    let error;
    if (d.id) {
      ({ error } = await sb().from("posts").update(row).eq("id", d.id));
    } else {
      const base = d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "update";
      ({ error } = await sb().from("posts").insert({ ...row, slug: base }));
      if (error?.code === "23505") ({ error } = await sb().from("posts").insert({ ...row, slug: `${base}-${Date.now().toString(36).slice(-4)}` }));
    }
    setBusy(false);
    if (error) return setState(error.message);
    await refreshSite(session);
    onDone(true);
  }

  const lbl = "grid gap-1 text-sm font-semibold";
  return (
    <form onSubmit={save} className="plate grid gap-4 p-5 sm:p-6">
      <h3 className="text-xl font-semibold">{d.id ? "Edit update" : "New update"}</h3>
      <label className={lbl}>
        Title
        <input className="field" value={d.title} maxLength={120} onChange={(e) => set("title", e.target.value)} required />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={lbl}>
          Category
          <select className="field" value={d.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className={lbl}>
          Cover photo from the site
          <select className="field" value={d.cover_url.startsWith("/photos/") ? d.cover_url : ""} onChange={(e) => set("cover_url", e.target.value)}>
            <option value="">{d.cover_url && !d.cover_url.startsWith("/photos/") ? "Uploaded photo in use" : "No cover photo"}</option>
            {SITE_PHOTOS.map((p) => (
              <option key={p} value={`/photos/${p}`}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {d.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoSrc(d.cover_url, 800)} alt="" className="h-20 w-32 rounded-lg object-cover" />
        )}
        <label className="btn btn-quiet !min-h-10 cursor-pointer !py-2">
          Upload a cover photo
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pick} />
        </label>
        {d.cover_url && (
          <button type="button" className="text-sm font-semibold underline" onClick={() => set("cover_url", "")}>
            Remove cover
          </button>
        )}
      </div>
      <label className={lbl}>
        Short summary (shown on cards)
        <textarea className="field min-h-20" value={d.summary} maxLength={240} onChange={(e) => set("summary", e.target.value)} />
      </label>
      <label className={lbl}>
        Full text
        <textarea className="field min-h-56" value={d.body} maxLength={12000} onChange={(e) => set("body", e.target.value)} />
        <span className="text-xs font-normal text-ink2">Leave an empty line between paragraphs.</span>
      </label>
      <label className="flex items-center gap-2.5 text-sm font-semibold">
        <input type="checkbox" className="h-4 w-4 accent-[#067a2e]" checked={d.is_published} onChange={(e) => set("is_published", e.target.checked)} />
        Shown on the website
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-go !min-h-10 !py-2" disabled={busy}>
          {d.id ? "Save changes" : "Publish update"}
        </button>
        <button type="button" className="btn btn-quiet !min-h-10 !py-2" onClick={() => onDone(false)}>
          Cancel
        </button>
        <p className="text-sm font-semibold" aria-live="polite">
          {state}
        </p>
      </div>
    </form>
  );
}

export function Updates({ session, onShare }: { session: Session; onShare?: (p: { subject: string; body: string }) => void }) {
  const [rows, setRows] = useState<PostRow[]>([]);
  const [edit, setEdit] = useState<Draft | null>(null);
  const [ask, setAsk] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb().from("posts").select("*").order("published_at", { ascending: false });
    if (error) setErr(error.message);
    setRows((data ?? []) as PostRow[]);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function toggle(r: PostRow) {
    const { error } = await sb().from("posts").update({ is_published: !r.is_published, updated_by: session.user.id }).eq("id", r.id);
    if (error) return setErr(error.message);
    await refreshSite(session);
    load();
  }
  async function remove(r: PostRow) {
    const { error } = await sb().from("posts").delete().eq("id", r.id);
    if (error) return setErr(error.message);
    const path = r.cover_url ? storagePath(r.cover_url) : null;
    if (path) await sb().storage.from("media").remove([path]);
    setAsk(null);
    await refreshSite(session);
    load();
  }

  if (edit)
    return (
      <div className="max-w-3xl">
        <PostEditor
          draft={edit}
          session={session}
          onDone={(saved) => {
            setEdit(null);
            if (saved) load();
          }}
        />
      </div>
    );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-ink2">Announcements shown on the home page and the Updates page. The newest three appear on the home page.</p>
        <button type="button" className="btn btn-go !min-h-10 !py-2" onClick={() => setEdit(blank)}>
          Write an update
        </button>
      </div>
      {err && <p role="alert" className="mt-3 font-semibold text-[#8f1a11]">{err}</p>}
      <ul className="mt-6 grid gap-3">
        {rows.map((r) => (
          <li key={r.id} className="plate-soft flex flex-wrap items-center gap-4 p-4">
            {r.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoSrc(r.cover_url, 800)} alt="" className="h-16 w-24 rounded-lg object-cover" />
            ) : (
              <span className="h-16 w-24 rounded-lg bg-cobalt-soft" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{r.title}</p>
              <p className="text-sm text-ink2">
                {r.category}, {longDate(r.published_at)}, {r.is_published ? "shown on website" : "hidden"}
              </p>
            </div>
            {ask === r.id ? (
              <div className="flex items-center gap-2 text-sm font-semibold">
                Delete for good?
                <button type="button" className="btn btn-quiet !min-h-9 !px-3 !py-1" onClick={() => remove(r)}>
                  Yes, delete
                </button>
                <button type="button" className="btn btn-quiet !min-h-9 !px-3 !py-1" onClick={() => setAsk(null)}>
                  Keep
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-quiet !min-h-9 !px-3 !py-1" onClick={() => setEdit({ id: r.id, slug: r.slug, title: r.title, summary: r.summary ?? "", body: r.body ?? "", category: r.category, cover_url: r.cover_url ?? "", is_published: r.is_published })}>
                  Edit
                </button>
                <button type="button" className="btn btn-quiet !min-h-9 !px-3 !py-1" onClick={() => toggle(r)}>
                  {r.is_published ? "Hide" : "Show"}
                </button>
                {onShare && r.is_published && (
                  <button
                    type="button"
                    className="btn btn-quiet !min-h-9 !px-3 !py-1"
                    onClick={() => onShare({ subject: r.title, body: `${r.summary ?? ""}\n\n[Read the full update](https://graas.org.in/updates/${r.slug})`.trim() })}
                  >
                    Email to members
                  </button>
                )}
                <button type="button" className="btn btn-quiet !min-h-9 !px-3 !py-1" onClick={() => setAsk(r.id)}>
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="mt-6 text-ink2">No updates yet. Write the first one.</p>}
    </div>
  );
}

/* ---------- Gallery ---------- */

type GalleryRow = { id: string; image_url: string; caption: string | null; credit: string | null; width: number | null; height: number | null; is_published: boolean; sort_order: number };

function GalleryCard({ row, first, last, onChange, onMove, onDelete }: { row: GalleryRow; first: boolean; last: boolean; onChange: (patch: Partial<GalleryRow>) => void; onMove: (d: -1 | 1) => void; onDelete: () => void }) {
  const [caption, setCaption] = useState(row.caption ?? "");
  const [ask, setAsk] = useState(false);
  const small = "btn btn-quiet !min-h-9 !px-3 !py-1 text-sm";
  return (
    <li className={`plate-soft overflow-hidden ${row.is_published ? "" : "opacity-60"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoSrc(row.image_url, 800)} alt="" className="aspect-[3/2] w-full object-cover" />
      <div className="grid gap-2.5 p-3">
        <input className="field !min-h-10" placeholder="Caption" value={caption} maxLength={140} onChange={(e) => setCaption(e.target.value)} onBlur={() => caption !== (row.caption ?? "") && onChange({ caption: caption.trim() || null })} aria-label="Caption" />
        {ask ? (
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            Delete this photo?
            <button type="button" className={small} onClick={onDelete}>
              Yes, delete
            </button>
            <button type="button" className={small} onClick={() => setAsk(false)}>
              Keep
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={small} onClick={() => onMove(-1)} disabled={first}>
              Earlier
            </button>
            <button type="button" className={small} onClick={() => onMove(1)} disabled={last}>
              Later
            </button>
            <button type="button" className={small} onClick={() => onChange({ is_published: !row.is_published })}>
              {row.is_published ? "Hide" : "Show"}
            </button>
            <button type="button" className={small} onClick={() => setAsk(true)}>
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

export function Gallery({ session }: { session: Session }) {
  const [rows, setRows] = useState<GalleryRow[]>([]);
  const [state, setState] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb().from("gallery_items").select("*").order("sort_order").order("created_at", { ascending: false });
    if (error) setState(error.message);
    setRows((data ?? []) as GalleryRow[]);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    // New photos go to the front, so the latest event is seen first.
    let order = (rows[0]?.sort_order ?? 10) - files.length * 10;
    let done = 0;
    for (const file of files) {
      setState(`Uploading ${done + 1} of ${files.length}…`);
      try {
        const { url, width, height } = await upload(file, "gallery");
        const { error } = await sb().from("gallery_items").insert({ image_url: url, width, height, credit: "GRAAS", sort_order: order, updated_by: session.user.id });
        if (error) throw new Error(error.message);
        order += 10;
        done += 1;
      } catch (x) {
        setState(`${file.name}: ${(x as Error).message}`);
        break;
      }
    }
    if (done === files.length) setState(`${done} photo${done === 1 ? "" : "s"} added. Add a caption to each.`);
    await refreshSite(session);
    load();
  }

  async function change(r: GalleryRow, patch: Partial<GalleryRow>) {
    const { error } = await sb().from("gallery_items").update({ ...patch, updated_by: session.user.id }).eq("id", r.id);
    if (error) return setState(error.message);
    await refreshSite(session);
    load();
  }
  async function move(i: number, d: -1 | 1) {
    const a = rows[i], b = rows[i + d];
    if (!a || !b) return;
    const [x, y] = a.sort_order === b.sort_order ? [b.sort_order + d, b.sort_order] : [b.sort_order, a.sort_order];
    await sb().from("gallery_items").update({ sort_order: x }).eq("id", a.id);
    await sb().from("gallery_items").update({ sort_order: y }).eq("id", b.id);
    await refreshSite(session);
    load();
  }
  async function remove(r: GalleryRow) {
    const { error } = await sb().from("gallery_items").delete().eq("id", r.id);
    if (error) return setState(error.message);
    const path = storagePath(r.image_url);
    if (path) await sb().storage.from("media").remove([path]);
    await refreshSite(session);
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-ink2">Photos shown on the Gallery page and in the moving strip on the home page. Upload event photos here; large photos are made smaller automatically.</p>
        <label className="btn btn-go !min-h-10 cursor-pointer !py-2">
          Add photos
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={add} />
        </label>
      </div>
      <p className="mt-3 min-h-6 text-sm font-semibold" aria-live="polite">
        {state}
      </p>
      <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((r, i) => (
          <GalleryCard key={r.id} row={r} first={i === 0} last={i === rows.length - 1} onChange={(patch) => change(r, patch)} onMove={(d) => move(i, d)} onDelete={() => remove(r)} />
        ))}
      </ul>
      {rows.length === 0 && <p className="mt-6 text-ink2">No photos yet. Add the first ones.</p>}
    </div>
  );
}
