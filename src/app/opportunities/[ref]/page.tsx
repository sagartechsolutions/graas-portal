import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ApplyCta from "@/components/opps/ApplyCta";
import { OppBody, OppMeta, OrgLogo } from "@/components/opps/OppBits";
import { getOpportunities, getOpportunity } from "@/lib/data";

export async function generateStaticParams() {
  const items = await getOpportunities();
  return items.length ? items.map((o) => ({ ref: String(o.ref).toLowerCase() })) : [{ ref: "graas-opp-00000" }];
}

export async function generateMetadata({ params }: PageProps<"/opportunities/[ref]">): Promise<Metadata> {
  const { ref } = await params;
  const o = await getOpportunity(ref);
  return o ? { title: `${o.title}, ${o.org_name}`, description: o.summary ?? `${o.kind_label} at ${o.org_name} on GRAAS.` } : { title: "Opportunity" };
}

export default function Page({ params }: PageProps<"/opportunities/[ref]">) {
  return (
    <Suspense fallback={<section className="bg-mist"><div className="shell py-14"><div className="h-[60vh] animate-pulse rounded-[24px] bg-white" /></div></section>}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: Pick<PageProps<"/opportunities/[ref]">, "params">) {
  const { ref } = await params;
  const o = await getOpportunity(ref);
  if (!o) notFound();
  return (
    <section className="bg-mist">
      <div className="shell grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:py-14">
        <div className="grid gap-6">
          <Link href="/opportunities" className="text-sm font-semibold text-ink2 hover:text-ink">
            ← All opportunities
          </Link>
          <div className="card p-6 sm:p-8">
            <div className="flex flex-wrap items-start gap-5">
              <OrgLogo org={o.org} name={o.org_name} size={72} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-go-deep">
                  {o.kind_label} · {o.ref}
                </p>
                <h1 className="mt-1 text-[clamp(1.8rem,1.3rem+1.6vw,2.6rem)] font-semibold leading-tight tracking-tight">{o.title}</h1>
                <p className="mt-1 text-lg font-medium text-ink2">{o.org_name}</p>
                <OppMeta o={o} className="mt-2" />
              </div>
            </div>
            <div className="mt-8">
              <OppBody o={o} />
            </div>
          </div>
        </div>
        <aside className="grid content-start gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <ApplyCta refNo={o.ref} open={!!o.open} />
          </div>
          <div className="card p-6 text-sm text-ink2">
            <p className="font-semibold text-ink">Checked by GRAAS</p>
            <p className="mt-1">Every opportunity is reviewed before it is published. GRAAS never charges members to apply. If anyone asks you for money, write to connect@graas.org.in.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
