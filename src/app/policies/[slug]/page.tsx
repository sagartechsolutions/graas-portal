import type { Metadata } from "next";
import { Suspense } from "react";
import PolicyArticle from "@/components/policy/PolicyArticle";
import { getPolicies, getPolicy } from "@/lib/data";

export async function generateStaticParams() {
  return (await getPolicies()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/policies/[slug]">): Promise<Metadata> {
  const p = await getPolicy((await params).slug);
  return p ? { title: p.title, description: p.summary } : { title: "Policy not found" };
}

async function FromParams({ params }: Pick<PageProps<"/policies/[slug]">, "params">) {
  return <PolicyArticle slug={(await params).slug} />;
}

export default function Page({ params }: PageProps<"/policies/[slug]">) {
  return (
    <section className="shell pb-20 pt-10 lg:pb-28 lg:pt-14">
      <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-[24px] bg-mist" />}>
        <FromParams params={params} />
      </Suspense>
    </section>
  );
}
