import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EventBody } from "@/components/events/EvBits";
import RegisterCta from "@/components/events/RegisterCta";
import { getEvent, getEvents } from "@/lib/data";

export async function generateStaticParams() {
  const items = await getEvents();
  return items.length ? items.map((e) => ({ ref: String(e.ref).toLowerCase() })) : [{ ref: "graas-evt-00000" }];
}

export async function generateMetadata({ params }: PageProps<"/events/[ref]">): Promise<Metadata> {
  const { ref } = await params;
  const e = await getEvent(ref);
  return e ? { title: e.title, description: e.summary ?? `${e.kind_label} by ${e.host?.name ?? "GRAAS"}.` } : { title: "Event" };
}

export default function Page({ params }: PageProps<"/events/[ref]">) {
  return (
    <Suspense fallback={<section className="bg-mist"><div className="shell py-14"><div className="h-[60vh] animate-pulse rounded-[24px] bg-white" /></div></section>}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: Pick<PageProps<"/events/[ref]">, "params">) {
  const { ref } = await params;
  const e = await getEvent(ref);
  if (!e) notFound();
  return (
    <section className="bg-mist">
      <div className="shell grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:py-14">
        <div className="grid gap-6">
          <Link href="/events" className="text-sm font-semibold text-ink2 hover:text-ink">
            ← All events
          </Link>
          <div className="card p-6 sm:p-8">
            <p className="text-sm font-semibold text-go-deep">
              {e.kind_label} · {e.ref}
              {e.status === "cancelled" ? " · Cancelled" : ""}
            </p>
            <h1 className="mt-1 text-[clamp(1.8rem,1.3rem+1.6vw,2.6rem)] font-semibold leading-tight tracking-tight">{e.title}</h1>
            <p className="mt-1 text-lg font-medium text-ink2">By {e.host?.name ?? "GRAAS"}</p>
            <div className="mt-8">
              <EventBody e={e} />
            </div>
          </div>
        </div>
        <aside className="side-lock grid content-start gap-4">
          <div className="card p-6">
            <RegisterCta refNo={e.ref} open={!!e.open} />
          </div>
          <div className="card p-6 text-sm text-ink2">
            <p className="font-semibold text-ink">Checked by GRAAS</p>
            <p className="mt-1">GRAAS approves every event before it is listed. Pay only through GRAAS; never pay a host directly.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
