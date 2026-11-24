import type { Metadata } from "next";
import { PostCard } from "@/components/home/UpdatesPreview";
import JoinBand from "@/components/home/JoinBand";
import { getPosts } from "@/lib/data";

export const metadata: Metadata = { title: "Updates", description: "Announcements and news from the Global Robotics And Automation Society." };

export default async function Page() {
  const posts = await getPosts(60);
  return (
    <>
      <section className="shell pb-20 pt-10 lg:pb-28 lg:pt-16">
        <h1 className="h-display !text-[clamp(2.4rem,1.5rem+3.6vw,4.1rem)]">Updates</h1>
        <p className="lede mt-4">Announcements from GRAAS: membership, chapters, lectures, events and the conference.</p>
        {posts.length === 0 ? (
          <p className="card mt-12 p-8 text-ink2">Nothing has been published yet. The first announcement will appear here.</p>
        ) : (
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <li key={p.slug}>
                <PostCard post={p} tile />
              </li>
            ))}
          </ul>
        )}
      </section>
      <JoinBand />
    </>
  );
}
