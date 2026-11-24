import Link from "next/link";
import Photo from "@/components/ui/Photo";
import { getPosts, type Post } from "@/lib/data";
import { longDate } from "@/lib/format";

export function PostCard({ post, lead = false, tile = false }: { post: Post; lead?: boolean; tile?: boolean }) {
  const tall = lead || tile;
  return (
    <article className={`card card-lift group relative flex h-full overflow-hidden ${tall ? "flex-col" : "flex-col sm:flex-row"}`}>
      {post.cover_url && (
        <div className={`overflow-hidden bg-mist ${tall ? "aspect-[16/9]" : "aspect-[16/9] sm:aspect-auto sm:w-44 sm:shrink-0 lg:w-48"}`}>
          <Photo src={post.cover_url} alt="" sizes={lead ? "(min-width: 1024px) 640px, 100vw" : tile ? "(min-width: 1024px) 400px, 100vw" : "(min-width: 640px) 200px, 100vw"} className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
        </div>
      )}
      <div className={`flex flex-1 flex-col ${lead ? "p-6 sm:p-8" : "p-5 sm:p-6"}`}>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink2">
          <span className="rounded-full bg-go-soft px-2.5 py-0.5 font-semibold text-go-deep">{post.category}</span>
          <time dateTime={post.published_at}>{longDate(post.published_at)}</time>
        </p>
        <h3 className={`mt-3 font-semibold tracking-tight ${lead ? "text-2xl sm:text-[1.75rem] sm:leading-tight" : "text-xl leading-snug"}`}>
          <Link href={`/updates/${post.slug}`} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h3>
        {post.summary && <p className={`mt-2 text-ink2 ${lead ? "" : tile ? "text-[0.95rem]" : "line-clamp-2 text-[0.95rem]"}`}>{post.summary}</p>}
      </div>
    </article>
  );
}

export default async function UpdatesPreview() {
  const posts = await getPosts(3);
  if (posts.length === 0) return null;
  const [first, ...rest] = posts;
  return (
    <section id="updates" className="section">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="h-section">Updates from GRAAS.</h2>
          <Link href="/updates" className="link">
            All updates
          </Link>
        </div>
        <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <PostCard post={first} lead />
          <div className="grid gap-5">
            {rest.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
