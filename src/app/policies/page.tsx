import type { Metadata } from "next";
import Link from "next/link";
import JoinBand from "@/components/home/JoinBand";
import { getPolicies } from "@/lib/data";
import { longDate } from "@/lib/format";

export const metadata: Metadata = { title: "Rules and policies", description: "GRAAS membership rules, code of conduct, refund policy, terms of use and privacy policy." };

export default async function Page() {
  const policies = await getPolicies();
  return (
    <>
      <section className="shell pb-12 pt-7 lg:pb-16 lg:pt-10">
        <h1 className="h-display !text-[clamp(2.4rem,1.5rem+3.6vw,4.1rem)]">Rules and policies</h1>
        <p className="lede mt-4">The rules every member agrees to, and how GRAAS handles fees, refunds and personal details.</p>
        <ul className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {policies.map((p) => (
            <li key={p.slug}>
              <Link href={`/policies/${p.slug}`} className="card card-lift flex h-full flex-col p-6 sm:p-8">
                <h2 className="h-card !text-2xl">{p.title}</h2>
                <p className="mt-2 text-ink2">{p.summary}</p>
                <p className="mt-auto pt-6 text-sm text-ink2">In effect from {longDate(p.effective_on)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <JoinBand />
    </>
  );
}
