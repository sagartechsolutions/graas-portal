import type { Metadata } from "next";
import { Suspense } from "react";
import PublicProfile from "@/components/member/PublicProfile";

/* graas.org.in/m/<member or chapter number>: the page every GRAAS QR code opens. The page itself is the same
   for every number; the browser asks GRAAS records for the details, so they are always current. */

export function generateStaticParams() {
  return [{ no: "graas-check" }];
}

export const metadata: Metadata = {
  title: "Verified GRAAS member",
  description: "Check a GRAAS membership and see the member's verified profile.",
  robots: { index: false, follow: true },
};

export default function Page({ params }: PageProps<"/m/[no]">) {
  return (
    <Suspense fallback={<section className="bg-mist"><div className="shell py-12"><div className="h-56 animate-pulse rounded-[24px] bg-white" /></div></section>}>
      <Member params={params} />
    </Suspense>
  );
}

async function Member({ params }: Pick<PageProps<"/m/[no]">, "params">) {
  const { no } = await params;
  return <PublicProfile no={decodeURIComponent(no).slice(0, 40)} />;
}
