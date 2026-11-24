import Link from "next/link";
import Photo from "@/components/ui/Photo";
import { getGallery, type GalleryItem } from "@/lib/data";

function Row({ items, reverse = false }: { items: GalleryItem[]; reverse?: boolean }) {
  // The list is rendered twice so the strip can loop without a visible seam.
  return (
    <div className="marquee">
      <div className={`marquee-track ${reverse ? "reverse" : ""}`}>
        {[0, 1].map((copy) =>
          items.map((g) => {
            const ratio = g.width && g.height ? g.width / g.height : 1.5;
            return (
              <div key={`${copy}-${g.id}`} aria-hidden={copy === 1} className="h-44 shrink-0 overflow-hidden rounded-2xl sm:h-60" style={{ aspectRatio: Math.max(0.8, Math.min(ratio, 1.9)) }}>
                <Photo src={g.image_url} alt={copy === 0 ? (g.caption ?? "") : ""} sizes="400px" className="h-full w-full" />
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

export default async function GalleryStrip() {
  const items = await getGallery(16);
  if (items.length < 4) return null;
  const half = Math.ceil(items.length / 2);
  return (
    <section id="gallery" className="section overflow-hidden bg-mist">
      <div className="shell flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="h-section">The field you are joining.</h2>
          <p className="lede mt-4">Arms on production lines, competition robots, boards on a bench. Photos from GRAAS chapters and events will be added here as they happen.</p>
        </div>
        <Link href="/gallery" className="link">
          Open the gallery
        </Link>
      </div>
      <div className="mt-12 grid gap-4">
        <Row items={items.slice(0, half)} />
        <Row items={items.slice(half)} reverse />
      </div>
    </section>
  );
}
