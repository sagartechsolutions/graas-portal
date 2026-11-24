import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import PreRegister from "@/components/home/PreRegister";
import Photo from "@/components/ui/Photo";
import { getPost, getPosts } from "@/lib/data";
import { longDate } from "@/lib/format";

export async function generateStaticParams() {
  const posts = await getPosts(60);
  return posts.length ? posts.map((p) => ({ slug: p.slug })) : [{ slug: "membership-pre-registration-open" }];
}

export async function generateMetadata({ params }: PageProps<"/updates/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Update not found" };
  return { title: post.title, description: post.summary ?? undefined };
}

async function Article({ params }: Pick<PageProps<"/updates/[slug]">, "params">) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    return (
      <div className="py-10">
        <h1 className="h-section">This update is not available.</h1>
        <p className="lede mt-4">It may have been removed, or the address is mistyped.</p>
        <p className="mt-8">
          <Link href="/updates" className="btn btn-primary">
            See all updates
          </Link>
        </p>
      </div>
    );
  }
  return (
    <article>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink2">
        <span className="rounded-full bg-go-soft px-2.5 py-0.5 font-semibold text-go-deep">{post.category}</span>
        <time dateTime={post.published_at}>{longDate(post.published_at)}</time>
      </p>
      <h1 className="h-section mt-4">{post.title}</h1>
      {post.summary && <p className="lede mt-5 !max-w-none">{post.summary}</p>}
      {post.cover_url && (
        <div className="mt-10 aspect-[16/9] overflow-hidden rounded-[24px]">
          <Photo src={post.cover_url} alt="" eager sizes="(min-width: 800px) 768px, 100vw" className="h-full w-full" />
        </div>
      )}
      <div className="mt-10 grid gap-5 text-lg leading-relaxed">
        {(post.body ?? "")
          .split(/\n{2,}/)
          .map((para) => para.trim())
          .filter(Boolean)
          .map((para, i) => (
            <p key={i} className="whitespace-pre-line">
              {para}
            </p>
          ))}
      </div>
    </article>
  );
}

export default function Page({ params }: PageProps<"/updates/[slug]">) {
  return (
    <>
      <section className="mx-auto w-full max-w-3xl px-5 pb-20 pt-8 sm:px-8 lg:pb-28 lg:pt-12">
        <p className="mb-8">
          <Link href="/updates" className="link text-[0.95rem]">
            All updates
          </Link>
        </p>
        <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-[24px] bg-mist" />}>
          <Article params={params} />
        </Suspense>
      </section>
      <PreRegister />
    </>
  );
}
