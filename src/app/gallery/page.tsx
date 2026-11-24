import type { Metadata } from "next";
import GalleryGrid from "@/components/gallery/GalleryGrid";
import JoinBand from "@/components/home/JoinBand";
import { getGallery } from "@/lib/data";

export const metadata: Metadata = { title: "Gallery", description: "Robotics and automation in pictures, from the Global Robotics And Automation Society." };

export default async function Page() {
  const items = await getGallery(120);
  return (
    <>
      <section className="shell pb-20 pt-10 lg:pb-28 lg:pt-16">
        <h1 className="h-display !text-[clamp(2.4rem,1.5rem+3.6vw,4.1rem)]">Gallery</h1>
        <p className="lede mt-4">The machines and the work that members train for. Photos from GRAAS chapters, lectures and events will be added here as they happen.</p>
        {items.length === 0 ? <p className="card mt-12 p-8 text-ink2">Photos will appear here soon.</p> : <GalleryGrid items={items} />}
      </section>
      <JoinBand />
    </>
  );
}
