import Link from "next/link";
import { getPolicies, getPolicy } from "@/lib/data";
import { longDate } from "@/lib/format";
import PolicyBody from "./PolicyBody";

export default async function PolicyArticle({ slug }: { slug: string }) {
  const [p, all] = await Promise.all([getPolicy(slug), getPolicies()]);
  if (!p)
    return (
      <div>
        <h1 className="h-section">This policy is not available.</h1>
        <p className="mt-6">
          <Link href="/policies" className="btn btn-primary">
            See all policies
          </Link>
        </p>
      </div>
    );
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
      <article>
        <h1 className="h-section">{p.title}</h1>
        <p className="lede mt-4 !max-w-none">{p.summary}</p>
        <p className="mt-4 text-sm text-ink2">In effect from {longDate(p.effective_on)}</p>
        <div className="mt-7">
          <PolicyBody body={p.body} />
        </div>
      </article>
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <p className="text-sm font-semibold text-ink2">All policies</p>
        <ul className="mt-3 grid gap-1">
          {all.map((x) => (
            <li key={x.slug}>
              <Link href={`/policies/${x.slug}`} className={`block rounded-xl px-3.5 py-2.5 font-medium transition-colors hover:bg-mist ${x.slug === p.slug ? "bg-mist text-ink" : "text-ink2"}`} aria-current={x.slug === p.slug ? "page" : undefined}>
                {x.title}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/join" className="btn btn-primary mt-6 w-full">
          Become a member
        </Link>
      </aside>
    </div>
  );
}
