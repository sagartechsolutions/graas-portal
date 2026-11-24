"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Photo from "@/components/ui/Photo";
import type { GalleryItem } from "@/lib/data";
import { photoSrc } from "@/lib/photos";

/** A column layout that keeps every photograph's own shape, with a full-screen viewer. */
export default function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open !== null && !el.open) el.showModal();
    if (open === null && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  const cur = open === null ? null : items[open];
  const nav = "flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20";

  return (
    <>
      <ul className="mt-12 columns-2 gap-4 lg:columns-3 [&>li]:mb-4">
        {items.map((g, i) => (
          <li key={g.id} className="break-inside-avoid">
            <button type="button" onClick={() => setOpen(i)} className="group relative block w-full overflow-hidden rounded-2xl bg-mist text-left" style={{ aspectRatio: g.width && g.height ? `${g.width} / ${g.height}` : "3 / 2" }} aria-label={`Open photo: ${g.caption ?? "untitled"}`}>
              <Photo src={g.image_url} alt={g.caption ?? ""} sizes="(min-width: 1024px) 400px, 50vw" className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
              {g.caption && (
                <span className="absolute inset-x-0 bottom-0 hidden translate-y-2 bg-gradient-to-t from-ink/80 to-transparent p-4 pt-10 text-sm font-medium text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 sm:block">
                  {g.caption}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === dialog.current && setOpen(null)}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink/95 p-0 text-white backdrop:bg-ink/60"
        aria-label="Photo viewer"
      >
        {cur && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 p-4 sm:px-6">
              <p className="readout text-sm text-white/70">
                {(open ?? 0) + 1} / {items.length}
              </p>
              <button type="button" className={nav} onClick={() => setOpen(null)} aria-label="Close viewer" autoFocus>
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M4 4 14 14M14 4 4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center gap-3 px-3 sm:px-6">
              <button type="button" className={`${nav} hidden shrink-0 sm:flex`} onClick={() => step(-1)} aria-label="Previous photo">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M11 3.5 5.5 9 11 14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={cur.id} src={photoSrc(cur.image_url)} alt={cur.caption ?? ""} className="max-h-full min-h-0 max-w-full min-w-0 rounded-xl object-contain" />
              <button type="button" className={`${nav} hidden shrink-0 sm:flex`} onClick={() => step(1)} aria-label="Next photo">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M7 3.5 12.5 9 7 14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-between gap-4 p-4 sm:px-6">
              <p className="min-w-0">
                <span className="block font-medium">{cur.caption}</span>
                {cur.credit && <span className="text-sm text-white/60">Photo: {cur.credit}</span>}
              </p>
              <div className="flex shrink-0 gap-2 sm:hidden">
                <button type="button" className={nav} onClick={() => step(-1)} aria-label="Previous photo">
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path d="M11 3.5 5.5 9 11 14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button type="button" className={nav} onClick={() => step(1)} aria-label="Next photo">
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path d="M7 3.5 12.5 9 7 14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
